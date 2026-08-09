import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

import { applyEmotionEvent } from "@lumi/profiles/application";
import { UtilityEvaluator } from "@lumi/npc-intelligence/application";
import type {
  CandidateAction,
  UtilityWeightPolicy,
} from "@lumi/npc-intelligence/domain";

import { PersistedCharacterDecisionContextAdapter } from "@/lib/emotional-decision-runtime";
import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";
import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";

const enabled =
  process.env.ULTEF_SCENARIO === "PX-LUMI-04-EMOTION-DECISION-001";
const databaseUrl = process.env.STORY_TEST_DATABASE_URL;
const destructive = process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true";
const ultefDescribe =
  enabled && destructive && databaseUrl ? describe : describe.skip;

let pool: pg.Pool;

function assertSafeDisposableDatabase(url: string) {
  const name = new URL(url).pathname.replace(/^\//, "").split("?")[0] ?? "";
  if (!name.includes("test") && !name.includes("review")) {
    throw new Error(
      `PX-LUMI-04 requires a disposable DB; got database '${name}'.`,
    );
  }
}

const candidate: CandidateAction = {
  id: "continue-calmly",
  kind: "continue",
  description: "Sakin biçimde patikada ilerle",
  requiredFactIds: [],
  targetCharacterId: null,
  needTypes: [],
  personalityFit: 0.5,
  safety: "safe",
};

const emotionOnlyPolicy: UtilityWeightPolicy = {
  version: "px04-emotion-only-v1",
  updatedAt: new Date("2026-08-09T00:00:00.000Z"),
  weights: {
    needSatisfaction: 0,
    emotionalComfort: 1,
    safety: 0,
    goalAlignment: 0,
    relationshipImpact: 0,
    socialApproval: 0,
    curiosity: 0,
    personalityFit: 0,
    timeSensitivity: 0,
    resourceCost: 0,
    timeCost: 0,
  },
};

beforeAll(async () => {
  if (!enabled || !destructive || !databaseUrl) return;
  assertSafeDisposableDatabase(databaseUrl);
  process.env.DATABASE_URL = databaseUrl;
  pool = new pg.Pool({ connectionString: databaseUrl });
});

afterAll(async () => {
  if (pool) await pool.end();
});

ultefDescribe("PX-LUMI-04-EMOTION-DECISION-001", () => {
  it("derives a bounded event emotion delta and feeds the persisted result into utility evaluation", async () => {
    const userId = crypto.randomUUID();
    const householdId = crypto.randomUUID();
    const childProfileId = crypto.randomUUID();
    const characterId = crypto.randomUUID();
    const scenario = createScenario({
      id: "PX-LUMI-04-EMOTION-DECISION-001",
      title: "Event-driven persisted emotion reaches downstream decision utility",
      level: "PX-LUMI",
      projectGate: "PX-LUMI-04",
      seed: "px-lumi-04-emotion-decision-001",
    });
    let report: ReturnType<typeof scenario.finish> | null = null;

    try {
      await pool.query(
        `INSERT INTO profile.households (id, name, slug)
         VALUES ($1, 'PX04 Household', $2)`,
        [householdId, `px04-${householdId}`],
      );
      await pool.query(
        `INSERT INTO profile.household_members
          (household_id, user_id, membership_role, is_active)
         VALUES ($1, $2, 'owner', true)`,
        [householdId, userId],
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
           'eski isiklar','px04-universe',
           '{"ageBand":"6-8","contentBoundary":"moderate","requireParentApprovalForAi":false}'::jsonb,
           'child_avatar','childhood',1)`,
        [characterId, childProfileId, householdId, crypto.randomUUID()],
      );

      const initialEmotions = {
        joy: 0.4,
        sadness: 0.2,
        fear: 0.6,
        anger: 0.1,
        surprise: 0.3,
        trust: 0.5,
      } as const;
      for (const [dimension, value] of Object.entries(initialEmotions)) {
        await pool.query(
          `INSERT INTO profile.character_emotion_state
            (character_id, dimension, value)
           VALUES ($1, $2, $3)`,
          [characterId, dimension, value],
        );
      }

      const decisionAdapter = new PersistedCharacterDecisionContextAdapter();
      const utility = new UtilityEvaluator();
      const beforeContext = await decisionAdapter.resolve({
        userId,
        householdId,
        characterId,
      });
      const beforeScore = utility.evaluate(
        [candidate],
        beforeContext,
        emotionOnlyPolicy,
      )[0];
      expect(beforeScore).toBeDefined();

      scenario.setup("EmotionPreState", {
        characterId,
        version: 1,
        emotions: beforeContext.emotions,
        decisionContextHash: beforeContext.contentHash,
        emotionalComfort: beforeScore!.components.emotionalComfort,
      });

      const applied = await applyEmotionEvent(
        userId,
        householdId,
        characterId,
        {
          kind: "reassuring_success",
          evidence: "Arin güvenli patikayı başarıyla tamamladı.",
          intensity: 1,
        },
      );

      const reloadedRows = await pool.query(
        `SELECT dimension, value
         FROM profile.character_emotion_state
         WHERE character_id = $1
         ORDER BY dimension`,
        [characterId],
      );
      const reloaded = Object.fromEntries(
        reloadedRows.rows.map((row) => [row.dimension, row.value]),
      ) as Record<string, number>;

      const afterContext = await decisionAdapter.resolve({
        userId,
        householdId,
        characterId,
      });
      const afterScore = utility.evaluate(
        [candidate],
        afterContext,
        emotionOnlyPolicy,
      )[0];
      expect(afterScore).toBeDefined();

      expect(applied.ruleVersion).toBe("emotion-rules-v1");
      expect(applied.deltas.map((delta) => delta.dimension)).toEqual([
        "joy",
        "fear",
        "trust",
      ]);
      expect(applied.unchangedDimensions).toEqual([
        "sadness",
        "anger",
        "surprise",
      ]);
      expect(reloaded.joy).toBeCloseTo(0.58, 5);
      expect(reloaded.fear).toBeCloseTo(0.4, 5);
      expect(reloaded.trust).toBeCloseTo(0.6, 5);
      expect(reloaded.sadness).toBeCloseTo(0.2, 5);
      expect(reloaded.anger).toBeCloseTo(0.1, 5);
      expect(reloaded.surprise).toBeCloseTo(0.3, 5);
      expect(afterContext.emotions.joy).toBeCloseTo(reloaded.joy!, 5);
      expect(afterContext.emotions.fear).toBeCloseTo(reloaded.fear!, 5);
      expect(afterContext.emotions.trust).toBeCloseTo(reloaded.trust!, 5);
      expect(afterScore!.components.emotionalComfort).toBeGreaterThan(
        beforeScore!.components.emotionalComfort,
      );
      expect(afterScore!.total).toBeGreaterThan(beforeScore!.total);
      expect(afterContext.contentHash).not.toBe(beforeContext.contentHash);

      scenario.event("story_event", "Reassuring success occurred", {
        kind: applied.event.kind,
        evidence: applied.event.evidence,
        ruleVersion: applied.ruleVersion,
      });
      scenario.event("emotion_delta", "Derived bounded emotion deltas", {
        deltas: applied.deltas,
        unchangedDimensions: applied.unchangedDimensions,
      });
      scenario.event("emotion_reload", "Reloaded persisted emotion vector", {
        emotions: reloaded,
      });
      scenario.event(
        "decision_context",
        "Resolved production decision context from persisted profile state",
        {
          beforeHash: beforeContext.contentHash,
          afterHash: afterContext.contentHash,
        },
      );
      scenario.delta(
        "character.emotions.joy",
        initialEmotions.joy,
        reloaded.joy,
        "reassuring_success rule",
      );
      scenario.delta(
        "character.emotions.fear",
        initialEmotions.fear,
        reloaded.fear,
        "reassuring_success rule",
      );
      scenario.delta(
        "character.emotions.trust",
        initialEmotions.trust,
        reloaded.trust,
        "reassuring_success rule",
      );
      scenario.delta(
        "decision.utility.emotionalComfort",
        beforeScore!.components.emotionalComfort,
        afterScore!.components.emotionalComfort,
        "persisted post-event emotion consumed by UtilityEvaluator",
      );
      scenario.assert(
        "event produces the intended directional emotion delta",
        reloaded.joy! > initialEmotions.joy &&
          reloaded.fear! < initialEmotions.fear &&
          reloaded.trust! > initialEmotions.trust,
        "joy up, fear down, trust up",
        reloaded,
      );
      scenario.assert(
        "unrelated emotion dimensions remain unchanged",
        Math.abs(reloaded.sadness! - initialEmotions.sadness) < 0.00001 &&
          Math.abs(reloaded.anger! - initialEmotions.anger) < 0.00001 &&
          Math.abs(reloaded.surprise! - initialEmotions.surprise) < 0.00001,
        "sadness, anger and surprise unchanged",
        reloaded,
      );
      scenario.assert(
        "persisted post-event vector is consumed by decision utility",
        afterScore!.components.emotionalComfort >
          beforeScore!.components.emotionalComfort,
        `>${beforeScore!.components.emotionalComfort}`,
        afterScore!.components.emotionalComfort,
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
