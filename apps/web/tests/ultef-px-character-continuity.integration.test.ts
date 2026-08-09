import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

import {
  StorySceneGenerationService,
  type OpenRouterCaller,
  type StorySceneLlmSettingsPort,
} from "@lumi/story/application";
import type { StoryHookState } from "@lumi/story/domain";

import { NpcBeliefStoryContinuityContextAdapter } from "@/lib/story-continuity-context-runtime";
import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";
import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";

const enabled =
  process.env.ULTEF_SCENARIO === "PX-LUMI-02-CHARACTER-RELOAD-STORY-001";
const databaseUrl = process.env.STORY_TEST_DATABASE_URL;
const destructive = process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true";
const ultefDescribe =
  enabled && destructive && databaseUrl ? describe : describe.skip;

let pool: pg.Pool;

function assertSafeDisposableDatabase(url: string) {
  const name = new URL(url).pathname.replace(/^\//, "").split("?")[0] ?? "";
  if (!name.includes("test") && !name.includes("review")) {
    throw new Error(
      `PX-LUMI-02 requires a disposable DB; got database '${name}'.`,
    );
  }
}

const settingsPort: StorySceneLlmSettingsPort = {
  async resolveSettings() {
    return {
      apiKey: "ultef-test-key",
      modelId: "deterministic-ultef-provider",
      temperature: 0,
      maxOutputTokens: 512,
      contentBoundary: "guvenli cocuk hikayesi",
      ageBand: "6-8",
      locale: "tr-TR",
    };
  },
};

function makeHook(input: {
  householdId: string;
  childProfileId: string;
  worldId: string;
}): StoryHookState {
  return {
    id: crypto.randomUUID(),
    householdId: input.householdId,
    childProfileId: input.childProfileId,
    storySessionId: crypto.randomUUID(),
    worldId: input.worldId,
    opportunityId: crypto.randomUUID(),
    hookType: "quest_seed",
    sourceNpcId: crypto.randomUUID(),
    targetNpcId: null,
    payload: { prompt: "Arin yeni bir patikaya cikiyor." },
    constraints: {},
    sceneType: "narrative",
    status: "pending",
    version: 1,
    createdAt: new Date(),
    consumedAt: null,
  };
}

function continuityAwareCaller(capturedPrompts: string[]): OpenRouterCaller {
  return async (_apiKey, input) => {
    const prompt =
      input.messages.find((message) => message.role === "user")?.content ?? "";
    capturedPrompts.push(prompt);
    const hasPersistedTrait = prompt.includes("courage=0.82");
    const hasPersistedVersion = prompt.includes("kalıcı karakter sürümü 2");

    return {
      model: "deterministic-ultef-provider",
      content: JSON.stringify({
        sceneId: "px02-later-scene",
        setting: "Gunes Vadisi patikasi",
        characters: ["Arin"],
        narrative:
          hasPersistedTrait && hasPersistedVersion
            ? "Arin, onceki deneyiminden gelen cesaretini hatirlayip yeni patikaya kararlilikla adim atti."
            : "Arin yeni patikaya dogru ilerledi.",
        moment:
          hasPersistedTrait && hasPersistedVersion
            ? "Kalici karakter degisimi sonraki sahneyi etkiledi."
            : "Yeni bir yolculuk basladi.",
        nextPrompt: "Arin patikanin sonundaki isigi arastirsin.",
      }),
    };
  };
}

beforeAll(async () => {
  if (!enabled || !destructive || !databaseUrl) return;
  assertSafeDisposableDatabase(databaseUrl);
  process.env.DATABASE_URL = databaseUrl;
  pool = new pg.Pool({ connectionString: databaseUrl });
});

afterAll(async () => {
  if (pool) await pool.end();
});

ultefDescribe("PX-LUMI-02-CHARACTER-RELOAD-STORY-001", () => {
  it("reloads a persisted character mutation into production continuity and later scene generation", async () => {
    const householdId = crypto.randomUUID();
    const childProfileId = crypto.randomUUID();
    const characterId = crypto.randomUUID();
    const worldId = crypto.randomUUID();
    const scenario = createScenario({
      id: "PX-LUMI-02-CHARACTER-RELOAD-STORY-001",
      title: "Persisted character mutation reaches later story context",
      level: "PX-LUMI",
      projectGate: "PX-LUMI-02",
      seed: "px-lumi-02-character-reload-story-001",
    });
    let report: ReturnType<typeof scenario.finish> | null = null;

    try {
      await pool.query(
        `INSERT INTO profile.households (id, name, slug)
         VALUES ($1, 'PX02 Household', $2)`,
        [householdId, `px02-${householdId}`],
      );
      await pool.query(
        `INSERT INTO profile.child_profiles
          (id, household_id, display_name, age_band, locale, metadata)
         VALUES ($1, $2, 'Deniz', '6-8', 'tr-TR', '{}'::jsonb)`,
        [childProfileId, householdId],
      );
      await pool.query(
        `INSERT INTO profile.lumi_characters
          (id, child_profile_id, household_id, name, broad_kind,
           character_type, subtype, origin_mode, first_origin_package_id,
           origin_concept, starting_region_archetype, starting_location,
           home_archetype, nearby_npc_seed, first_mystery_seed, universe_seed,
           safety_bounds, character_subtype, lifecycle_stage, version)
         VALUES
          ($1,$2,$3,'Arin','human','explorer','orman kasifi','auto',$4,
           'Merakli bir kasif','orman','orman girisi','agac ev','Bora',
           'eski isiklar','px02-universe',
           '{"ageBand":"6-8","contentBoundary":"moderate","requireParentApprovalForAi":false}'::jsonb,
           'child_avatar','childhood',1)`,
        [characterId, childProfileId, householdId, crypto.randomUUID()],
      );
      await pool.query(
        `INSERT INTO profile.character_trait_state
          (character_id, dimension, value)
         VALUES ($1, 'courage', 0.40)`,
        [characterId],
      );

      scenario.setup("CharacterPreState", {
        characterId,
        version: 1,
        courage: 0.4,
      });

      await pool.query(
        `UPDATE profile.character_trait_state
         SET value = 0.82, updated_at = now()
         WHERE character_id = $1 AND dimension = 'courage'`,
        [characterId],
      );
      await pool.query(
        `UPDATE profile.lumi_characters
         SET version = 2, updated_at = now()
         WHERE id = $1 AND household_id = $2`,
        [characterId, householdId],
      );

      const reloaded = await pool.query(
        `SELECT c.version, t.value AS courage
         FROM profile.lumi_characters c
         JOIN profile.character_trait_state t ON t.character_id = c.id
         WHERE c.id = $1 AND c.household_id = $2
           AND c.child_profile_id = $3 AND t.dimension = 'courage'`,
        [characterId, householdId, childProfileId],
      );
      expect(reloaded.rows[0]).toMatchObject({ version: 2, courage: 0.82 });

      const prompts: string[] = [];
      const service = new StorySceneGenerationService();
      const result = await service.generateSceneFromHook({
        hook: makeHook({ householdId, childProfileId, worldId }),
        childProfileId,
        characterId,
        continuityPort: new NpcBeliefStoryContinuityContextAdapter(),
        settingsPort,
        callOpenRouter: continuityAwareCaller(prompts),
        maxAttempts: 1,
      });

      expect(prompts).toHaveLength(1);
      expect(prompts[0]).toContain("Aktif karakter Arin");
      expect(prompts[0]).toContain("kalıcı karakter sürümü 2");
      expect(prompts[0]).toContain("courage=0.82");
      expect(result.scene.narrative).toContain("cesaretini hatirlayip");

      scenario.event(
        "character_mutation",
        "Persisted bounded courage mutation",
        {
          characterId,
          from: 0.4,
          to: 0.82,
          versionFrom: 1,
          versionTo: 2,
        },
      );
      scenario.event("character_reload", "Reloaded persisted character state", {
        version: reloaded.rows[0].version,
        courage: reloaded.rows[0].courage,
      });
      scenario.event(
        "later_story",
        "Generated later scene with production continuity",
        { narrative: result.scene.narrative },
      );
      scenario.delta("character.version", 1, 2, "persisted character mutation");
      scenario.delta(
        "character.traits.courage",
        0.4,
        0.82,
        "bounded trait update",
      );
      scenario.assert(
        "persisted character mutation appears in later story context",
        prompts[0].includes("kalıcı karakter sürümü 2") &&
          prompts[0].includes("courage=0.82"),
        "version=2 and courage=0.82 in production continuity prompt",
        prompts[0],
      );
      scenario.assert(
        "later generated scene uses the persisted mutation",
        result.scene.narrative.includes("cesaretini hatirlayip"),
        "scene narrative reflects persisted courage",
        result.scene.narrative,
      );
      report = scenario.finish({ result: "PASS" });
    } catch (error) {
      report = scenario.finish({
        result: "FAIL",
        reason: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      if (report) await writeScenarioArtifacts(report);
      await pool.query(`DELETE FROM profile.households WHERE id = $1`, [
        householdId,
      ]);
    }
  });
});
