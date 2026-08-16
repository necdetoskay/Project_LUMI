import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import pg from "pg";

const llmMock = vi.hoisted(() => vi.fn());
vi.mock(
  "../../../packages/profiles/src/application/text-llm-gateway.service",
  () => ({
    generateTextWithLlm: llmMock,
  }),
);

import {
  chooseCharacterCreationDirection,
  chooseCharacterIdentity,
  getActiveCharacterCreationCycle,
} from "../../../packages/profiles/src/application/character-creation-cycle.service";
import { generateCharacterFirstIdentitySuggestions } from "../../../packages/profiles/src/application/character-first-identity-suggestion.service";
import {
  chooseCanonicalCharacterType,
  chooseUniverse,
} from "../../../packages/profiles/src/application/character-foundation-onboarding.service";

const url = process.env.STORY_TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const enabled =
  process.env.LUMI_ONBOARDING_FAILURE_E2E === "1" &&
  process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true" &&
  Boolean(url);
const suite = enabled ? describe : describe.skip;

function generated(content: string) {
  return {
    content,
    provider: "openrouter" as const,
    model: "failure-injection/test-model",
    promptTokens: 10,
    completionTokens: 10,
    totalTokens: 20,
    latencyMs: 1,
    cost: null,
  };
}

suite("Character Onboarding M6 failure paths", () => {
  let pool: pg.Pool;
  let userId: string;
  let householdId: string;
  let childProfileId: string;

  async function seedFixture() {
    userId = crypto.randomUUID();
    householdId = crypto.randomUUID();
    childProfileId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO profile.households(id,name,slug) VALUES($1,'M6 Failure E2E',$2)`,
      [householdId, `m6-${householdId}`],
    );
    await pool.query(
      `INSERT INTO profile.household_members(household_id,user_id,membership_role,is_active)
       VALUES($1,$2,'owner',true)`,
      [householdId, userId],
    );
    await pool.query(
      `INSERT INTO profile.child_profiles(id,household_id,display_name,age_band,locale,metadata)
       VALUES($1,$2,'M6 Kaşif','6-8','tr-TR',$3::jsonb)`,
      [
        childProfileId,
        householdId,
        JSON.stringify({ interests: ["space", "crystals"] }),
      ],
    );
    await pool.query(
      `INSERT INTO profile.parental_settings(household_id,content_boundary,require_parent_approval_for_ai)
       VALUES($1,'strict',false)`,
      [householdId],
    );
  }

  async function cleanupFixture() {
    if (!householdId) return;
    await pool.query(
      `DELETE FROM profile.ai_generation_traces WHERE household_id=$1`,
      [householdId],
    );
    await pool.query(
      `DELETE FROM profile.character_creation_selections WHERE household_id=$1`,
      [householdId],
    );
    await pool.query(
      `DELETE FROM profile.character_creation_cycles WHERE household_id=$1`,
      [householdId],
    );
    await pool.query(
      `DELETE FROM profile.parental_settings WHERE household_id=$1`,
      [householdId],
    );
    await pool.query(
      `DELETE FROM profile.child_profiles WHERE household_id=$1`,
      [householdId],
    );
    await pool.query(
      `DELETE FROM profile.household_members WHERE household_id=$1`,
      [householdId],
    );
    await pool.query(`DELETE FROM profile.households WHERE id=$1`, [
      householdId,
    ]);
  }

  async function startCharacterFirst() {
    await chooseCharacterCreationDirection(userId, {
      householdId,
      childProfileId,
      direction: "character_first",
    });
    await chooseCanonicalCharacterType(userId, {
      householdId,
      childProfileId,
      characterType: "fantastic",
    });
  }

  async function cycleSnapshot() {
    const result = await pool.query(
      `SELECT id,status,current_step,latest_summary FROM profile.character_creation_cycles
       WHERE household_id=$1 AND child_profile_id=$2 ORDER BY updated_at DESC LIMIT 1`,
      [householdId, childProfileId],
    );
    return result.rows[0];
  }

  async function selectionCount(stepKey: string) {
    const result = await pool.query(
      `SELECT count(*)::int AS count FROM profile.character_creation_selections
       WHERE household_id=$1 AND step_key=$2`,
      [householdId, stepKey],
    );
    return result.rows[0].count as number;
  }

  beforeAll(() => {
    if (!url) throw new Error("DATABASE_URL_REQUIRED");
    const name = new URL(url).pathname.replace(/^\//, "").toLowerCase();
    if (!name.includes("test") && !name.includes("review")) {
      throw new Error(`Unsafe DB for M6 failure E2E: ${name}`);
    }
    pool = new pg.Pool({ connectionString: url, max: 4 });
  });

  beforeEach(async () => {
    llmMock.mockReset();
    await cleanupFixture();
    await seedFixture();
  });

  afterAll(async () => {
    await cleanupFixture();
    await pool?.end();
  });

  it("rejects schema-breaking LLM output after retries without advancing state", async () => {
    await startCharacterFirst();
    llmMock.mockResolvedValue(generated('{"suggestions":[{"key":"broken"}]}'));

    await expect(
      generateCharacterFirstIdentitySuggestions(userId, {
        householdId,
        childProfileId,
      }),
    ).rejects.toThrow();

    expect((await cycleSnapshot()).current_step).toBe("character_identity");
    expect(await selectionCount("character_identity")).toBe(0);
    const traces = await pool.query(
      `SELECT validation_status FROM profile.ai_generation_traces
       WHERE household_id=$1 AND task_type='character_identity_suggestions'`,
      [householdId],
    );
    expect(traces.rowCount).toBe(3);
    expect(
      traces.rows.every((row) => row.validation_status === "invalid"),
    ).toBe(true);
  });

  it("rejects empty candidate output without corrupting the draft", async () => {
    await startCharacterFirst();
    llmMock.mockResolvedValue(generated('{"suggestions":[]}'));

    await expect(
      generateCharacterFirstIdentitySuggestions(userId, {
        householdId,
        childProfileId,
      }),
    ).rejects.toThrow();

    const cycle = await cycleSnapshot();
    expect(cycle.current_step).toBe("character_identity");
    expect(cycle.latest_summary.characterType).toEqual({
      characterType: "fantastic",
    });
    expect(await selectionCount("character_identity")).toBe(0);
  });

  it("survives provider timeout/error with draft state untouched", async () => {
    await startCharacterFirst();
    llmMock.mockRejectedValue(new Error("LLM_PROVIDER_TIMEOUT"));

    await expect(
      generateCharacterFirstIdentitySuggestions(userId, {
        householdId,
        childProfileId,
      }),
    ).rejects.toThrow("LLM_PROVIDER_TIMEOUT");

    expect((await cycleSnapshot()).current_step).toBe("character_identity");
    expect(await selectionCount("character_identity")).toBe(0);
  });

  it("resumes the same interrupted creation cycle and continues normally", async () => {
    await startCharacterFirst();
    const before = await getActiveCharacterCreationCycle(
      userId,
      householdId,
      childProfileId,
    );
    expect(before?.currentStep).toBe("character_identity");

    const afterReload = await getActiveCharacterCreationCycle(
      userId,
      householdId,
      childProfileId,
    );
    expect(afterReload?.id).toBe(before?.id);
    expect(afterReload?.currentStep).toBe("character_identity");

    await chooseCharacterIdentity(userId, {
      householdId,
      childProfileId,
      suggestion: {
        key: "resume-1",
        name: "Nova",
        identity: "Yıldız ışığından doğan meraklı bir gezgin.",
        traits: ["curious", "gentle", "brave"],
        fitReason: "Çocuğun keşif ilgisiyle uyumlu.",
      },
    });
    expect((await cycleSnapshot()).current_step).toBe("universe");
  });

  it("rejects out-of-order transitions without persisting the invalid selection", async () => {
    await chooseCharacterCreationDirection(userId, {
      householdId,
      childProfileId,
      direction: "character_first",
    });

    await expect(
      chooseUniverse(userId, {
        householdId,
        childProfileId,
        universe: { key: "too-early", name: "Erken Evren" },
      }),
    ).rejects.toThrow("ONBOARDING_STEP_OUT_OF_ORDER");

    expect((await cycleSnapshot()).current_step).toBe("character_type");
    expect(await selectionCount("universe")).toBe(0);
  });

  it("rejects duplicate step submission and preserves exactly one canonical selection", async () => {
    await chooseCharacterCreationDirection(userId, {
      householdId,
      childProfileId,
      direction: "character_first",
    });
    await chooseCanonicalCharacterType(userId, {
      householdId,
      childProfileId,
      characterType: "fantastic",
    });

    await expect(
      chooseCanonicalCharacterType(userId, {
        householdId,
        childProfileId,
        characterType: "animal",
      }),
    ).rejects.toThrow("ONBOARDING_STEP_OUT_OF_ORDER");

    expect(await selectionCount("character_type")).toBe(1);
    const cycle = await cycleSnapshot();
    expect(cycle.current_step).toBe("character_identity");
    expect(cycle.latest_summary.characterType).toEqual({
      characterType: "fantastic",
    });
  });
});
