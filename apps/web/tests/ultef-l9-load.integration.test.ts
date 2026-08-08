import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

import {
  WorldCommitService,
  __setTestCommitDb,
  __setTestGeneratedSceneDb,
  __setTestSessionDb,
  completeSession,
  persistGeneratedSceneAndAdvance,
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
  type StoryFixtureIds,
} from "../../../packages/story/tests/integration/ultef-fixtures";

const enabled = process.env.ULTEF_SCENARIO === "L9-LOAD-001";
const databaseUrl = process.env.STORY_TEST_DATABASE_URL;
const destructive = process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true";
const ultefDescribe =
  enabled && destructive && databaseUrl ? describe : describe.skip;

const TENANT_COUNT = Math.min(
  Math.max(Number(process.env.L9_LOAD_TENANTS ?? 8), 1),
  20,
);
const STEPS_PER_TENANT = Math.min(
  Math.max(Number(process.env.L9_LOAD_STEPS ?? 5), 1),
  10,
);
const P95_LIMIT_MS = Number(process.env.L9_LOAD_P95_LIMIT_MS ?? 1000);

let pool: pg.Pool;
let storyDb: ReturnType<typeof createStoryDatabase>;

function fixture(): StoryFixtureIds {
  return {
    householdId: crypto.randomUUID(),
    childProfileId: crypto.randomUUID(),
    characterId: crypto.randomUUID(),
    worldId: crypto.randomUUID(),
    storyDefinitionId: crypto.randomUUID(),
    storyVersionId: crypto.randomUUID(),
    entrySceneId: crypto.randomUUID(),
    storySessionId: crypto.randomUUID(),
  };
}

function percentile(values: number[], percentileValue: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.ceil((percentileValue / 100) * sorted.length) - 1,
  );
  return Math.round(sorted[index] ?? 0);
}

function assertSafeDisposableDatabase(url: string) {
  const name = new URL(url).pathname.replace(/^\//, "").split("?")[0] ?? "";
  if (!name.includes("test") && !name.includes("review")) {
    throw new Error(
      `ULTEF L9 load journey requires a disposable DB name containing test/review; got '${name}'.`,
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
});

afterAll(async () => {
  __setTestGeneratedSceneDb(undefined);
  __setTestSessionDb(undefined);
  __setTestCommitDb(undefined);
  if (pool) await pool.end();
});

ultefDescribe("ULTEF L9-LOAD-001 — DB-backed sustained mutation baseline", () => {
  it(
    "sustains concurrent tenant scene advances, commits and idempotent replays without state leakage",
    async () => {
      const fixtures = Array.from({ length: TENANT_COUNT }, () => fixture());
      const npcIds = fixtures.map(() => crypto.randomUUID());
      const durations: number[] = [];
      const producedCommitIds = new Set<string>();
      const failures: string[] = [];

      await Promise.all(fixtures.map((ids) => seedStoryFixture(pool, ids)));

      const scenario = createScenario({
        id: "L9-LOAD-001",
        title: "DB-backed concurrent mutation load baseline",
        level: "L9",
        projectGate: "L9-G6",
        seed: "l9-load-001",
      });
      scenario.setup("Tenant count", TENANT_COUNT);
      scenario.setup("Steps per tenant", STEPS_PER_TENANT);
      scenario.setup("Expected transitions", TENANT_COUNT * STEPS_PER_TENANT);
      scenario.setup("p95 threshold ms", P95_LIMIT_MS);

      const extractor = new NarrativeEventExtractor();
      const validator = new EvidenceValidator();
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
              ruleId: "l9-load-npc-state",
              sequence: event.sequence,
              evidenceRef: event.evidenceRef,
              status: "committed",
            }),
          },
        ],
      });
      const commitService = new WorldCommitService();

      const runTenant = async (
        ids: StoryFixtureIds,
        npcId: string,
        tenantIndex: number,
      ) => {
        let sessionVersion = 1;
        try {
          for (let step = 1; step <= STEPS_PER_TENANT; step += 1) {
            const startedAt = performance.now();
            const generated = await persistGeneratedSceneAndAdvance({
              sessionId: ids.storySessionId,
              expectedVersion: sessionVersion,
              scene: {
                sceneId: `l9-load-scene-${tenantIndex}-${step}`,
                setting: `Load path ${tenantIndex}`,
                characters: ["Arin", `NPC-${tenantIndex}`],
                moment: `Tenant ${tenantIndex} transition ${step}.`,
                narrative: `Tenant ${tenantIndex} kendi evreninde ${step}. yük geçişini tamamladı.`,
                nextPrompt: `Continue tenant ${tenantIndex} only.`,
              },
              sourceHookId: `l9-load-hook-${tenantIndex}-${step}`,
              modelId: "deterministic-ultef-provider",
              idempotencyKey: `l9-load-scene-${tenantIndex}-${step}`,
            });
            sessionVersion = generated.playbackState.session.version;

            const manifest = OutcomeManifest.create({
              storySessionId: ids.storySessionId,
              householdId: ids.householdId,
              worldId: ids.worldId,
              source: "story_session",
              sourceSceneId: generated.generatedSceneId,
              changes: [
                {
                  key: `l9-load-state-${tenantIndex}-${step}`,
                  outcomeType: "npc_state_update",
                  entityId: npcId,
                  operation: "set",
                  field: "memory.loadStep",
                  value: step,
                  evidenceRef: `scene://${generated.generatedSceneId}#load-step`,
                },
              ],
            });
            const snapshot = StoryContextSnapshot.create({
              storySessionId: ids.storySessionId,
              householdId: ids.householdId,
              worldId: ids.worldId,
              worldStateHash: `l9-load-before-${tenantIndex}-${step}`,
              entities: [
                {
                  entityId: npcId,
                  entityKind: "npc",
                  state: { memory: { loadStep: step - 1 } },
                  stateHash: `l9-load-npc-before-${tenantIndex}-${step}`,
                },
              ],
            });
            const input = {
              manifest,
              snapshot,
              extractor,
              validator,
              ruleEngine,
            };
            const committed = await commitService.commitManifest(input);
            const replayed = await commitService.commitManifest(input);
            if (replayed.commitId !== committed.commitId) {
              throw new Error(
                `IDEMPOTENCY_MISMATCH tenant=${tenantIndex} step=${step}`,
              );
            }
            producedCommitIds.add(committed.commitId);
            durations.push(performance.now() - startedAt);
          }

          await completeSession({
            sessionId: ids.storySessionId,
            expectedVersion: sessionVersion,
            idempotencyKey: `l9-load-complete-${tenantIndex}`,
          });
        } catch (error) {
          failures.push(
            error instanceof Error
              ? `tenant=${tenantIndex}: ${error.message}`
              : `tenant=${tenantIndex}: ${String(error)}`,
          );
        }
      };

      try {
        await Promise.all(
          fixtures.map((ids, index) => runTenant(ids, npcIds[index]!, index)),
        );

        const householdIds = fixtures.map((ids) => ids.householdId);
        const persistedCommits = await pool.query<{
          id: string;
          household_id: string;
          world_id: string;
        }>(
          `SELECT id, household_id, world_id
             FROM story.story_commit_records
            WHERE household_id = ANY($1::uuid[])`,
          [householdIds],
        );
        const worldVersions = await pool.query<{
          household_id: string;
          world_id: string;
          current_version: string;
        }>(
          `SELECT household_id, world_id, current_version
             FROM story.story_world_versions
            WHERE household_id = ANY($1::uuid[])`,
          [householdIds],
        );
        const sessions = await pool.query<{
          household_id: string;
          world_id: string;
          session_status: string;
        }>(
          `SELECT household_id, world_id, session_status
             FROM story.story_sessions
            WHERE household_id = ANY($1::uuid[])`,
          [householdIds],
        );

        const expectedTransitions = TENANT_COUNT * STEPS_PER_TENANT;
        const expectedWorldVersion = STEPS_PER_TENANT + 1;
        const fixtureScope = new Set(
          fixtures.map((ids) => `${ids.householdId}:${ids.worldId}`),
        );
        const crossTenantCommitLeak = persistedCommits.rows.filter(
          (row) => !fixtureScope.has(`${row.household_id}:${row.world_id}`),
        ).length;
        const crossTenantVersionLeak = worldVersions.rows.filter(
          (row) => !fixtureScope.has(`${row.household_id}:${row.world_id}`),
        ).length;
        const allWorldVersionsCorrect =
          worldVersions.rowCount === TENANT_COUNT &&
          worldVersions.rows.every(
            (row) => Number(row.current_version) === expectedWorldVersion,
          );
        const allSessionsCompleted =
          sessions.rowCount === TENANT_COUNT &&
          sessions.rows.every((row) => row.session_status === "completed");
        const commitCountCorrect =
          persistedCommits.rowCount === expectedTransitions &&
          producedCommitIds.size === expectedTransitions;
        const p50 = percentile(durations, 50);
        const p95 = percentile(durations, 95);
        const p99 = percentile(durations, 99);
        const max = Math.round(Math.max(...durations, 0));
        const latencyWithinBaseline = p95 <= P95_LIMIT_MS;
        const noFailures = failures.length === 0;
        const noScopeLeak =
          crossTenantCommitLeak === 0 && crossTenantVersionLeak === 0;

        scenario.event(
          "load.parallel-mutations.completed",
          `${durations.length}/${expectedTransitions} DB-backed transitions completed across ${TENANT_COUNT} concurrent tenant pipelines.`,
          { p50, p95, p99, max, failures },
        );
        scenario.assert(
          "All load transitions completed without runtime failures",
          noFailures && durations.length === expectedTransitions,
          expectedTransitions,
          { completed: durations.length, failures },
        );
        scenario.assert(
          "Exactly one commit persisted per transition despite replay",
          commitCountCorrect,
          expectedTransitions,
          {
            persisted: persistedCommits.rowCount,
            uniqueProduced: producedCommitIds.size,
          },
        );
        scenario.assert(
          "Tenant commit and world-version scopes did not leak",
          noScopeLeak,
          0,
          { crossTenantCommitLeak, crossTenantVersionLeak },
        );
        scenario.assert(
          "Every tenant world advanced independently to the expected version",
          allWorldVersionsCorrect,
          expectedWorldVersion,
          worldVersions.rows.map((row) => Number(row.current_version)),
        );
        scenario.assert(
          "Every load session completed cleanly",
          allSessionsCompleted,
          TENANT_COUNT,
          sessions.rows.filter((row) => row.session_status === "completed")
            .length,
        );
        scenario.assert(
          "DB-backed transition p95 stayed within the L9 baseline",
          latencyWithinBaseline,
          `<=${P95_LIMIT_MS}ms`,
          `${p95}ms`,
        );

        const passed =
          noFailures &&
          durations.length === expectedTransitions &&
          commitCountCorrect &&
          noScopeLeak &&
          allWorldVersionsCorrect &&
          allSessionsCompleted &&
          latencyWithinBaseline;
        const report = scenario.finish({
          result: passed ? "PASS" : "FAIL",
          reason: passed
            ? `Concurrent DB-backed mutation load stayed isolated and idempotent with p95=${p95}ms across ${expectedTransitions} transitions.`
            : "One or more L9 load baseline invariants failed.",
        });
        await writeScenarioArtifacts(report, {
          environment: "disposable-postgres-l9-load",
        });
        expect(report.result).toBe("PASS");
      } finally {
        for (const ids of fixtures) {
          await pool.query(
            "DELETE FROM story.story_outbox WHERE household_id = $1",
            [ids.householdId],
          );
          await pool.query(
            "DELETE FROM story.story_commit_records WHERE household_id = $1",
            [ids.householdId],
          );
          await pool.query(
            "DELETE FROM story.story_world_versions WHERE household_id = $1",
            [ids.householdId],
          );
          await cleanupStoryFixture(pool, ids);
        }
      }
    },
    60_000,
  );
});
