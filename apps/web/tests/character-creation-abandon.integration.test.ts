import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import pg from "pg";

import {
  abandonCharacterCreationCycle,
  chooseCharacterCreationDirection,
  getActiveCharacterCreationCycle,
} from "../../../packages/profiles/src/application/character-creation-cycle.service";

const url = process.env.STORY_TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const enabled =
  process.env.LUMI_CHARACTER_ABANDON_E2E === "1" &&
  process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true" &&
  Boolean(url);
const suite = enabled ? describe : describe.skip;

suite("Character creation cycle abandon", () => {
  let pool: pg.Pool;
  let userId: string;
  let householdId: string;
  let childProfileId: string;

  async function seedFixture() {
    userId = crypto.randomUUID();
    householdId = crypto.randomUUID();
    childProfileId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO profile.households(id,name,slug) VALUES($1,'Abandon E2E',$2)`,
      [householdId, `abandon-${householdId}`],
    );
    await pool.query(
      `INSERT INTO profile.household_members(household_id,user_id,membership_role,is_active)
       VALUES($1,$2,'owner',true)`,
      [householdId, userId],
    );
    await pool.query(
      `INSERT INTO profile.child_profiles(id,household_id,display_name,age_band,locale,metadata)
       VALUES($1,$2,'Abandon Kaşif','6-8','tr-TR',$3::jsonb)`,
      [childProfileId, householdId, JSON.stringify({ interests: ["space"] })],
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

  beforeAll(() => {
    if (!url) throw new Error("DATABASE_URL_REQUIRED");
    const name = new URL(url).pathname.replace(/^\//, "").toLowerCase();
    if (!name.includes("test") && !name.includes("review")) {
      throw new Error(`Unsafe DB for abandon E2E: ${name}`);
    }
    pool = new pg.Pool({ connectionString: url, max: 4 });
  });

  beforeEach(async () => {
    await cleanupFixture();
    await seedFixture();
    await chooseCharacterCreationDirection(userId, {
      householdId,
      childProfileId,
      direction: "character_first",
    });
  });

  afterAll(async () => {
    await cleanupFixture();
    await pool?.end();
  });

  it("abandons the active draft so it is no longer resumed", async () => {
    const before = await getActiveCharacterCreationCycle(
      userId,
      householdId,
      childProfileId,
    );
    expect(before?.status).toBe("draft");

    const result = await abandonCharacterCreationCycle(
      userId,
      householdId,
      childProfileId,
    );
    expect(result.status).toBe("abandoned");

    const cycle = await pool.query(
      `SELECT status, abandoned_at FROM profile.character_creation_cycles
       WHERE id=$1`,
      [before!.id],
    );
    expect(cycle.rows[0].status).toBe("abandoned");
    expect(cycle.rows[0].abandoned_at).not.toBeNull();

    const resumed = await getActiveCharacterCreationCycle(
      userId,
      householdId,
      childProfileId,
    );
    expect(resumed).toBeNull();
  });

  it("allows a fresh cycle after abandon (partial unique draft index)", async () => {
    await abandonCharacterCreationCycle(userId, householdId, childProfileId);

    const started = await chooseCharacterCreationDirection(userId, {
      householdId,
      childProfileId,
      direction: "character_first",
    });
    const count = await pool.query(
      `SELECT count(*)::int AS count FROM profile.character_creation_cycles
       WHERE household_id=$1 AND child_profile_id=$2 AND status='draft'`,
      [householdId, childProfileId],
    );
    expect(count.rows[0].count).toBe(1);
    expect(started.currentStep).toBe("character_type");
  });

  it("fails when there is no active draft cycle", async () => {
    await abandonCharacterCreationCycle(userId, householdId, childProfileId);

    await expect(
      abandonCharacterCreationCycle(userId, householdId, childProfileId),
    ).rejects.toThrow("CHARACTER_CREATION_CYCLE_REQUIRED");
  });
});
