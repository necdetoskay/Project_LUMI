import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

import {
  WorldCommitService,
  __setTestCommitDb,
  __setTestGeneratedSceneDb,
  __setTestPropagationDb,
  __setTestSessionDb,
  completeSession,
  persistGeneratedSceneAndAdvance,
  startSession,
} from "@lumi/story/application";
import { createDatabase as createStoryDatabase } from "@lumi/story/db/client";
import {
  EvidenceValidator,
  NarrativeEventExtractor,
  OutcomeManifest,
  StoryContextSnapshot,
  WorldCommitRuleEngine,
} from "@lumi/story/domain";

import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";
import {
  cleanupStoryFixture,
  seedStoryFixture,
} from "../../../packages/story/tests/integration/ultef-fixtures";

const enabled = process.env.ULTEF_SCENARIO === "L9-LONG-HORIZON-001";
const databaseUrl = process.env.STORY_TEST_DATABASE_URL;
const destructive = process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true";
const ultefDescribe =
  enabled && destructive && databaseUrl ? describe : describe.skip;

const TRANSITIONS = 10;
const MEMORY_FIELD = "memory.longHorizonMarker";

let pool: pg.Pool;
let storyDb: ReturnType<typeof createStoryDatabase>;

function assertSafeDisposableDatabase(url: string) {
  const name = new URL(url).pathname.replace(/^\//, "").split("?")[0] ?? "";
  if (!name.includes("test") && !name.includes("review")) {
    throw new Error(
      `ULTEF L9 long-horizon journey requires a disposable DB name containing test/review; got '${name}'.`,
    );
  }
}

beforeAll(async () => {
  if (!enabled || !destructive || !databaseUrl) return;
  assertSafeDisposableDatabase(databaseUrl);
  pool = new pg.Pool({ connectionString: databaseUrl });
  storyDb = createStoryDatabase(databaseUrl);
  __setTestGeneratedSceneDb(storyDb);
  __setTestSessionDb(storyDb);
  __setTestCommitDb(storyDb);
  __setTestPropagationDb(storyDb);
});

afterAll(async () => {
  __setTestGeneratedSceneDb(undefined);
  __setTestSessionDb(undefined);
  __setTestCommitDb(undefined);
  __setTestPropagationDb(undefined);
  if (pool) await pool.end();
});

ultefDescribe(
  "ULTEF L9-LONG-HORIZON-001 — ten-transition persisted continuity journey",
  () => {
    it("keeps one child/universe coherent across ten sequential sessions and world commits", async () => {
      const fixture = {
        householdId: crypto.randomUUID(),
        childProfileId: crypto.randomUUID(),
        characterId: crypto.randomUUID(),
        worldId: crypto.randomUUID(),
        storyDefinitionId: crypto.randomUUID(),
        storyVersionId: crypto.randomUUID(),
        entrySceneId: crypto.randomUUID(),
        storySessionId: crypto.randomUUID(),
      };
      const npcId = crypto.randomUUID();

      await seedStoryFixture(pool, fixture);

      const scenario = createScenario({
        id: "L9-LONG-HORIZON-001",
        title: "Ten-transition persisted continuity journey",
        level: "L9",
        projectGate: "L9-G1",
        seed: "l9-long-horizon-001",
      });

      scenario.setup("Household", {
        id: fixture.householdId,
        alias: "H-L9-LONG-001",
      });
      scenario.setup("Child", {
        id: fixture.childProfileId,
        name: "Deniz",
        ageBand: "6-8",
      });
      scenario.setup("Character", { id: fixture.characterId, name: "Arin" });
      scenario.setup("World", { id: fixture.worldId, name: "Gunes Vadisi" });
      scenario.setup("NPC", { id: npcId, name: "Mira" });
      scenario.setup("Transition target", { count: TRANSITIONS });

      const commitService = new WorldCommitService();
      const ruleEngine = new WorldCommitRuleEngine({
        rules: [
          {
            forEventType: "npc_state_changed",
            apply: ({ event, priority }) => ({
              changeKey: event.eventKey,
              entityId: event.entityId,
              kind: "set",
              field: event.detail.field,
              value: event.detail.value,
              priority,
              ruleId: "l9-long-horizon-memory",
              sequence: event.sequence,
              evidenceRef: event.evidenceRef,
              status: "committed",
            }),
          },
        ],
      });

      const sessionIds: string[] = [];
      const commitIds = new Set<string>();
      const fingerprints: string[] = [];
      let currentSessionId = fixture.storySessionId;
      let currentSessionVersion = 1;
      let previousWorldVersion: number | null = null;

      try {
        for (let step = 1; step <= TRANSITIONS; step += 1) {
          if (step > 1) {
            const later = await startSession({
              householdId: fixture.householdId,
              childProfileId: fixture.childProfileId,
              worldId: fixture.worldId,
              storyDefinitionId: fixture.storyDefinitionId,
              storyVersionId: fixture.storyVersionId,
              characterId: fixture.characterId,
              idempotencyKey: `l9-long-start-${step}`,
            });
            currentSessionId = later.session.id;
            currentSessionVersion = later.session.version;
          }
          sessionIds.push(currentSessionId);

          const marker = `journey-marker-${String(step).padStart(2, "0")}`;
          const generated = await persistGeneratedSceneAndAdvance({
            sessionId: currentSessionId,
            expectedVersion: currentSessionVersion,
            scene: {
              sceneId: `l9-long-scene-${step}`,
              setting: "Gunes Vadisi uzun yolculuk patikasi",
              characters: ["Arin", "Mira"],
              moment: `Arin onceki yolculuklarini hatirlarken Mira ${marker} isaretini kaydetti.`,
              narrative: `Deniz'in onceki secimlerinin izini suren Arin, Mira ile ${marker} isaretini konustu ve bunu sonraki yolculukta hatirlamak uzere kaydetti.`,
              nextPrompt:
                "Arin bir sonraki yolculukta onceki isareti hatirlayacak.",
            },
            sourceHookId: `l9-long-hook-${step}`,
            modelId: "deterministic-ultef-provider",
            idempotencyKey: `l9-long-scene-${step}`,
          });

          const manifest = OutcomeManifest.create({
            storySessionId: currentSessionId,
            householdId: fixture.householdId,
            worldId: fixture.worldId,
            source: "story_session",
            sourceSceneId: generated.generatedSceneId,
            changes: [
              {
                key: `l9-long-memory-${step}`,
                outcomeType: "npc_state_update",
                entityId: npcId,
                operation: "set",
                field: MEMORY_FIELD,
                value: marker,
                evidenceRef: `scene://${generated.generatedSceneId}#memory`,
              },
            ],
          });
          const snapshot = StoryContextSnapshot.create({
            storySessionId: currentSessionId,
            householdId: fixture.householdId,
            worldId: fixture.worldId,
            worldStateHash: `l9-before-${step}`,
            entities: [
              {
                entityId: npcId,
                entityKind: "npc",
                state: {
                  memory: {
                    longHorizonMarker:
                      step === 1
                        ? null
                        : `journey-marker-${String(step - 1).padStart(2, "0")}`,
                  },
                },
                stateHash: `mira-before-${step}`,
              },
            ],
          });

          const input = {
            manifest,
            snapshot,
            extractor: new NarrativeEventExtractor(),
            validator: new EvidenceValidator(),
            ruleEngine,
          };
          const committed = await commitService.commitManifest(input);
          const retried = await commitService.commitManifest(input);

          expect(retried.commitId).toBe(committed.commitId);
          expect(committed.worldVersionAfter).toBeGreaterThan(
            committed.worldVersionBefore,
          );
          if (previousWorldVersion !== null) {
            expect(committed.worldVersionBefore).toBe(previousWorldVersion);
          }
          previousWorldVersion = committed.worldVersionAfter;
          commitIds.add(committed.commitId);

          const stateRows = await pool.query<{
            world_version: number;
            commit_count: string;
            session_count: string;
          }>(
            `SELECT
               COALESCE((SELECT MAX(current_version::int) FROM story.story_world_versions WHERE household_id = $1 AND world_id = $2), 0)::int AS world_version,
               (SELECT COUNT(*) FROM story.story_commit_records WHERE household_id = $1 AND world_id = $2)::text AS commit_count,
               (SELECT COUNT(*) FROM story.story_sessions WHERE household_id = $1 AND world_id = $2)::text AS session_count`,
            [fixture.householdId, fixture.worldId],
          );
          const dbState = stateRows.rows[0];
          const fingerprint = [
            `step=${step}`,
            `session=${currentSessionId}`,
            `worldVersion=${dbState?.world_version ?? -1}`,
            `commits=${dbState?.commit_count ?? "-1"}`,
            `sessions=${dbState?.session_count ?? "-1"}`,
            `marker=${marker}`,
          ].join("|");
          fingerprints.push(fingerprint);

          scenario.event(
            "long-horizon.transition.completed",
            `Transition ${step}/${TRANSITIONS} completed with world version ${committed.worldVersionBefore} -> ${committed.worldVersionAfter}.`,
            {
              step,
              sessionId: currentSessionId,
              generatedSceneId: generated.generatedSceneId,
              commitId: committed.commitId,
              marker,
              fingerprint,
            },
          );
          scenario.assert(
            `Transition ${step} retry is idempotent`,
            retried.commitId === committed.commitId,
            committed.commitId,
            retried.commitId,
          );
          scenario.delta(
            `transition.${step}.worldVersion`,
            committed.worldVersionBefore,
            committed.worldVersionAfter,
            "long-horizon repeated outcome commit",
          );

          await completeSession({
            sessionId: currentSessionId,
            expectedVersion: generated.playbackState.session.version,
            idempotencyKey: `l9-long-complete-${step}`,
          });
        }

        const finalRows = await pool.query<{
          world_version: number;
          commit_count: string;
          completed_sessions: string;
        }>(
          `SELECT
             COALESCE((SELECT MAX(current_version::int) FROM story.story_world_versions WHERE household_id = $1 AND world_id = $2), 0)::int AS world_version,
             (SELECT COUNT(*) FROM story.story_commit_records WHERE household_id = $1 AND world_id = $2)::text AS commit_count,
             (SELECT COUNT(*) FROM story.story_sessions WHERE household_id = $1 AND world_id = $2 AND session_status = 'completed')::text AS completed_sessions`,
          [fixture.householdId, fixture.worldId],
        );
        const finalState = finalRows.rows[0];
        const uniqueSessionCount = new Set(sessionIds).size;

        scenario.assert(
          "Exactly ten unique sessions participated",
          uniqueSessionCount === TRANSITIONS,
          TRANSITIONS,
          uniqueSessionCount,
        );
        scenario.assert(
          "Exactly ten unique commits were created despite retries",
          commitIds.size === TRANSITIONS &&
            Number(finalState?.commit_count ?? 0) === TRANSITIONS,
          TRANSITIONS,
          {
            uniqueCommitIds: commitIds.size,
            persistedCommitCount: Number(finalState?.commit_count ?? 0),
          },
        );
        scenario.assert(
          "All ten sessions completed",
          Number(finalState?.completed_sessions ?? 0) === TRANSITIONS,
          TRANSITIONS,
          Number(finalState?.completed_sessions ?? 0),
        );
        scenario.assert(
          "Every transition retained a distinct state fingerprint",
          new Set(fingerprints).size === TRANSITIONS,
          TRANSITIONS,
          new Set(fingerprints).size,
        );

        const passed =
          uniqueSessionCount === TRANSITIONS &&
          commitIds.size === TRANSITIONS &&
          Number(finalState?.commit_count ?? 0) === TRANSITIONS &&
          Number(finalState?.completed_sessions ?? 0) === TRANSITIONS &&
          new Set(fingerprints).size === TRANSITIONS;

        const report = scenario.finish({
          result: passed ? "PASS" : "FAIL",
          reason: passed
            ? "Ten sequential sessions completed for the same child/universe, each generated a deterministic scene, committed one idempotent world mutation, advanced world version, and retained transition-level fingerprints without duplicate commits."
            : "One or more long-horizon continuity invariants failed.",
        });
        await writeScenarioArtifacts(report, {
          environment: "disposable-postgres-l9-long-horizon",
        });
        expect(report.result).toBe("PASS");
      } finally {
        await pool.query(
          "DELETE FROM story.story_outbox WHERE household_id = $1",
          [fixture.householdId],
        );
        await pool.query(
          "DELETE FROM story.story_commit_records WHERE household_id = $1",
          [fixture.householdId],
        );
        await pool.query(
          "DELETE FROM story.story_world_versions WHERE household_id = $1",
          [fixture.householdId],
        );
        await pool.query(
          `DELETE FROM story.story_idempotency_ledger
            WHERE story_session_id IN (
              SELECT id FROM story.story_sessions WHERE household_id = $1 AND world_id = $2
            )`,
          [fixture.householdId, fixture.worldId],
        );
        await pool.query(
          `DELETE FROM story.story_event_store
            WHERE story_session_id IN (
              SELECT id FROM story.story_sessions WHERE household_id = $1 AND world_id = $2
            )`,
          [fixture.householdId, fixture.worldId],
        );
        await pool.query(
          `DELETE FROM story.story_session_checkpoints
            WHERE story_session_id IN (
              SELECT id FROM story.story_sessions WHERE household_id = $1 AND world_id = $2
            )`,
          [fixture.householdId, fixture.worldId],
        );
        await pool.query(
          `DELETE FROM story.story_session_scene_visits
            WHERE story_session_id IN (
              SELECT id FROM story.story_sessions WHERE household_id = $1 AND world_id = $2
            )`,
          [fixture.householdId, fixture.worldId],
        );
        await pool.query(
          `DELETE FROM story.story_session_characters
            WHERE story_session_id IN (
              SELECT id FROM story.story_sessions WHERE household_id = $1 AND world_id = $2
            )`,
          [fixture.householdId, fixture.worldId],
        );
        await pool.query(
          `DELETE FROM story.story_sessions WHERE household_id = $1 AND world_id = $2`,
          [fixture.householdId, fixture.worldId],
        );
        await cleanupStoryFixture(pool, fixture);
      }
    });
  },
);
