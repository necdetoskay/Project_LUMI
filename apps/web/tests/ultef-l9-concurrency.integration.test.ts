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

const enabled = process.env.ULTEF_SCENARIO === "L9-CONCURRENCY-001";
const databaseUrl = process.env.STORY_TEST_DATABASE_URL;
const destructive = process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true";
const ultefDescribe =
  enabled && destructive && databaseUrl ? describe : describe.skip;

let pool: pg.Pool;
let storyDb: ReturnType<typeof createStoryDatabase>;

function assertSafeDisposableDatabase(url: string) {
  const name = new URL(url).pathname.replace(/^\//, "").split("?")[0] ?? "";
  if (!name.includes("test") && !name.includes("review")) {
    throw new Error(
      `ULTEF L9 concurrency journey requires a disposable DB name containing test/review; got '${name}'.`,
    );
  }
}

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
  "ULTEF L9-CONCURRENCY-001 — concurrent tenant state isolation",
  () => {
    it("keeps concurrent household/child/world session, commit and idempotency state isolated", async () => {
      const a = fixture();
      const b = fixture();
      const npcA = crypto.randomUUID();
      const npcB = crypto.randomUUID();

      await Promise.all([
        seedStoryFixture(pool, a),
        seedStoryFixture(pool, b),
      ]);

      const scenario = createScenario({
        id: "L9-CONCURRENCY-001",
        title: "Concurrent tenant state isolation",
        level: "L9",
        projectGate: "L9-G4",
        seed: "l9-concurrency-001",
      });
      scenario.setup("Tenant A", {
        householdId: a.householdId,
        childProfileId: a.childProfileId,
        worldId: a.worldId,
        sessionId: a.storySessionId,
      });
      scenario.setup("Tenant B", {
        householdId: b.householdId,
        childProfileId: b.childProfileId,
        worldId: b.worldId,
        sessionId: b.storySessionId,
      });

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
              ruleId: "l9-concurrency-isolation",
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
        label: "A" | "B",
      ) => {
        const marker = `tenant-${label.toLowerCase()}-marker`;
        const generated = await persistGeneratedSceneAndAdvance({
          sessionId: ids.storySessionId,
          expectedVersion: 1,
          scene: {
            sceneId: `l9-concurrency-scene-${label.toLowerCase()}`,
            setting: `Concurrent path ${label}`,
            characters: ["Arin", `Mira-${label}`],
            moment: `${label} household records only ${marker}.`,
            narrative: `Deniz ${label} kendi evreninde ${marker} isaretini kaydetti.`,
            nextPrompt: `Only tenant ${label} may observe this marker.`,
          },
          sourceHookId: `l9-concurrency-hook-${label.toLowerCase()}`,
          modelId: "deterministic-ultef-provider",
          idempotencyKey: `l9-concurrency-scene-${label.toLowerCase()}`,
        });

        const manifest = OutcomeManifest.create({
          storySessionId: ids.storySessionId,
          householdId: ids.householdId,
          worldId: ids.worldId,
          source: "story_session",
          sourceSceneId: generated.generatedSceneId,
          changes: [
            {
              key: `l9-concurrency-memory-${label.toLowerCase()}`,
              outcomeType: "npc_state_update",
              entityId: npcId,
              operation: "set",
              field: "memory.concurrentMarker",
              value: marker,
              evidenceRef: `scene://${generated.generatedSceneId}#memory`,
            },
          ],
        });
        const snapshot = StoryContextSnapshot.create({
          storySessionId: ids.storySessionId,
          householdId: ids.householdId,
          worldId: ids.worldId,
          worldStateHash: `l9-concurrency-before-${label.toLowerCase()}`,
          entities: [
            {
              entityId: npcId,
              entityKind: "npc",
              state: { memory: { concurrentMarker: null } },
              stateHash: `npc-before-${label.toLowerCase()}`,
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
        const replayed = await commitService.commitManifest(input);
        expect(replayed.commitId).toBe(committed.commitId);

        await completeSession({
          sessionId: ids.storySessionId,
          expectedVersion: generated.playbackState.session.version,
          idempotencyKey: `l9-concurrency-complete-${label.toLowerCase()}`,
        });

        return { marker, generated, committed };
      };

      try {
        const [resultA, resultB] = await Promise.all([
          runTenant(a, npcA, "A"),
          runTenant(b, npcB, "B"),
        ]);

        const isolation = await pool.query<{
          a_sessions: string;
          b_sessions: string;
          cross_sessions: string;
          a_commits: string;
          b_commits: string;
          cross_commits: string;
          ledger_scope_mismatches: string;
          a_world_version: number;
          b_world_version: number;
        }>(
          `SELECT
             (SELECT COUNT(*) FROM story.story_sessions WHERE household_id = $1 AND child_profile_id = $2 AND world_id = $3)::text AS a_sessions,
             (SELECT COUNT(*) FROM story.story_sessions WHERE household_id = $4 AND child_profile_id = $5 AND world_id = $6)::text AS b_sessions,
             ((SELECT COUNT(*) FROM story.story_sessions WHERE household_id = $1 AND world_id = $6) +
              (SELECT COUNT(*) FROM story.story_sessions WHERE household_id = $4 AND world_id = $3))::text AS cross_sessions,
             (SELECT COUNT(*) FROM story.story_commit_records WHERE household_id = $1 AND world_id = $3)::text AS a_commits,
             (SELECT COUNT(*) FROM story.story_commit_records WHERE household_id = $4 AND world_id = $6)::text AS b_commits,
             ((SELECT COUNT(*) FROM story.story_commit_records WHERE household_id = $1 AND world_id = $6) +
              (SELECT COUNT(*) FROM story.story_commit_records WHERE household_id = $4 AND world_id = $3))::text AS cross_commits,
             (SELECT COUNT(*)
                FROM story.story_idempotency_ledger l
                JOIN story.story_sessions s ON s.id = l.story_session_id
               WHERE s.id IN ($7, $8) AND l.household_id <> s.household_id)::text AS ledger_scope_mismatches,
             COALESCE((SELECT MAX(current_version::int) FROM story.story_world_versions WHERE household_id = $1 AND world_id = $3), 0)::int AS a_world_version,
             COALESCE((SELECT MAX(current_version::int) FROM story.story_world_versions WHERE household_id = $4 AND world_id = $6), 0)::int AS b_world_version`,
          [
            a.householdId,
            a.childProfileId,
            a.worldId,
            b.householdId,
            b.childProfileId,
            b.worldId,
            a.storySessionId,
            b.storySessionId,
          ],
        );
        const state = isolation.rows[0];

        const noSessionLeak = Number(state?.cross_sessions ?? -1) === 0;
        const noCommitLeak = Number(state?.cross_commits ?? -1) === 0;
        const noLedgerLeak = Number(state?.ledger_scope_mismatches ?? -1) === 0;
        const tenantCountsCorrect =
          Number(state?.a_sessions ?? 0) === 1 &&
          Number(state?.b_sessions ?? 0) === 1 &&
          Number(state?.a_commits ?? 0) === 1 &&
          Number(state?.b_commits ?? 0) === 1;
        const versionsIndependent =
          state?.a_world_version === 2 && state?.b_world_version === 2;
        const commitIdsDistinct =
          resultA.committed.commitId !== resultB.committed.commitId;
        const sceneIdsDistinct =
          resultA.generated.generatedSceneId !==
          resultB.generated.generatedSceneId;

        scenario.event(
          "concurrency.parallel-run.completed",
          "Two independent household/child/world pipelines advanced, committed, replayed and completed concurrently.",
          {
            tenantACommit: resultA.committed.commitId,
            tenantBCommit: resultB.committed.commitId,
            tenantAWorldVersion: state?.a_world_version,
            tenantBWorldVersion: state?.b_world_version,
          },
        );
        scenario.assert(
          "No cross-household/world sessions were created",
          noSessionLeak,
          0,
          Number(state?.cross_sessions ?? -1),
        );
        scenario.assert(
          "No cross-household/world commits were created",
          noCommitLeak,
          0,
          Number(state?.cross_commits ?? -1),
        );
        scenario.assert(
          "Idempotency ledger retained session household scope",
          noLedgerLeak,
          0,
          Number(state?.ledger_scope_mismatches ?? -1),
        );
        scenario.assert(
          "Each tenant retained exactly one session and one idempotent commit",
          tenantCountsCorrect,
          { sessions: 1, commits: 1 },
          {
            aSessions: Number(state?.a_sessions ?? 0),
            bSessions: Number(state?.b_sessions ?? 0),
            aCommits: Number(state?.a_commits ?? 0),
            bCommits: Number(state?.b_commits ?? 0),
          },
        );
        scenario.assert(
          "World versions advanced independently",
          versionsIndependent,
          { a: 2, b: 2 },
          { a: state?.a_world_version, b: state?.b_world_version },
        );
        scenario.assert(
          "Concurrent tenants produced distinct session artifacts",
          commitIdsDistinct && sceneIdsDistinct,
          true,
          { commitIdsDistinct, sceneIdsDistinct },
        );

        const passed =
          noSessionLeak &&
          noCommitLeak &&
          noLedgerLeak &&
          tenantCountsCorrect &&
          versionsIndependent &&
          commitIdsDistinct &&
          sceneIdsDistinct;

        const report = scenario.finish({
          result: passed ? "PASS" : "FAIL",
          reason: passed
            ? "Concurrent tenant pipelines remained isolated across session, commit, world-version and idempotency persistence."
            : "One or more concurrent tenant isolation invariants failed.",
        });
        await writeScenarioArtifacts(report, {
          environment: "disposable-postgres-l9-concurrency",
        });
        expect(report.result).toBe("PASS");
      } finally {
        for (const ids of [a, b]) {
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
    });
  },
);
