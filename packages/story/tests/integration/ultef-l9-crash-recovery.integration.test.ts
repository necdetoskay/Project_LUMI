import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";

import * as schema from "../../src/db/schema/story";
import type { Database } from "../../src/db/client";
import {
  EvidenceValidator,
  NarrativeEventExtractor,
  OutcomeManifest,
  StoryContextSnapshot,
  WorldCommitRuleEngine,
  defaultOutcomeRules,
} from "../../src/domain/outcome";
import {
  WorldCommitService,
  __setTestCommitDb,
} from "../../src/application/world-commit.service";
import { createScenario } from "../../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../../tooling/ultef/src/artifacts.mjs";
import { cleanupStoryFixture, seedStoryFixture } from "./ultef-fixtures";

const enabled = process.env.ULTEF_SCENARIO === "L9-CRASH-RECOVERY-001";
const databaseUrl = process.env.STORY_TEST_DATABASE_URL;
const destructive = process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true";
const describeDb =
  enabled && destructive && databaseUrl ? describe : describe.skip;

let pool: pg.Pool | null = null;
let queryClient: ReturnType<typeof postgres> | null = null;
let db: Database | null = null;

function assertSafeDisposableDatabase(url: string) {
  const name = new URL(url).pathname.replace(/^\//, "").split("?")[0] ?? "";
  if (!name.includes("test") && !name.includes("review")) {
    throw new Error(
      `ULTEF L9 crash recovery requires a disposable DB name containing test/review; got '${name}'.`,
    );
  }
}

async function connect(url: string) {
  queryClient = postgres(url, { max: 2 });
  db = drizzle(queryClient, { schema });
  __setTestCommitDb(db);
}

async function disconnect() {
  __setTestCommitDb(undefined);
  if (queryClient) {
    await queryClient.end();
    queryClient = null;
  }
  db = null;
}

async function readState(
  database: Database,
  fixture: { householdId: string; worldId: string; storySessionId: string },
) {
  const commits = await database
    .select()
    .from(schema.storyCommitRecords)
    .where(eq(schema.storyCommitRecords.householdId, fixture.householdId));
  const worldVersions = await database
    .select()
    .from(schema.storyWorldVersions)
    .where(
      and(
        eq(schema.storyWorldVersions.householdId, fixture.householdId),
        eq(schema.storyWorldVersions.worldId, fixture.worldId),
      ),
    );
  const events = await database
    .select()
    .from(schema.storyEventStore)
    .where(eq(schema.storyEventStore.storySessionId, fixture.storySessionId));
  const outbox = await database
    .select()
    .from(schema.storyOutbox)
    .where(eq(schema.storyOutbox.householdId, fixture.householdId));

  return {
    commitCount: commits.length,
    commitIds: commits.map((row) => row.id).sort(),
    worldVersionCount: worldVersions.length,
    worldVersion: worldVersions[0]?.currentVersion ?? null,
    eventCount: events.length,
    outboxCount: outbox.length,
    pendingOutboxCount: outbox.filter((row) => row.status === "pending").length,
  };
}

describeDb("ULTEF L9 — crash/restart recovery", () => {
  beforeAll(async () => {
    if (!databaseUrl) return;
    assertSafeDisposableDatabase(databaseUrl);
    pool = new pg.Pool({ connectionString: databaseUrl });
    await connect(databaseUrl);
  });

  afterAll(async () => {
    await disconnect();
    if (pool) await pool.end();
  });

  it(
    "L9-CRASH-RECOVERY-001 preserves committed state and idempotency across process restart",
    async () => {
      if (!databaseUrl || !db || !pool) {
        throw new Error("STORY_TEST_DATABASE_URL_REQUIRED");
      }

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

      try {
        const scenario = createScenario({
          id: "L9-CRASH-RECOVERY-001",
          title: "Committed world state survives process crash and restart",
          level: "L9",
          projectGate: "L9-G5",
          seed: "runtime-uuid",
        });
        scenario.setup("Household", fixture.householdId);
        scenario.setup("World", fixture.worldId);
        scenario.setup("Session", fixture.storySessionId);

        const extractor = new NarrativeEventExtractor();
        const validator = new EvidenceValidator();
        const ruleEngine = new WorldCommitRuleEngine({
          rules: defaultOutcomeRules(),
        });
        const snapshot = StoryContextSnapshot.create({
          storySessionId: fixture.storySessionId,
          householdId: fixture.householdId,
          worldId: fixture.worldId,
          worldStateHash: "l9-crash-before",
          entities: [
            {
              entityId: npcId,
              entityKind: "npc",
              state: { need: { hunger: 20 } },
              stateHash: "l9-crash-npc-before",
            },
          ],
        });
        const manifest = OutcomeManifest.create({
          storySessionId: fixture.storySessionId,
          householdId: fixture.householdId,
          worldId: fixture.worldId,
          source: "story_session",
          sourceSceneId: "l9-crash-scene",
          changes: [
            {
              key: "l9-crash-npc-state",
              outcomeType: "npc_state_update",
              entityId: npcId,
              operation: "set",
              field: "need.hunger",
              value: 55,
              evidenceRef: "scene://l9/crash#npc-state",
            },
          ],
        });
        const input = { manifest, snapshot, extractor, validator, ruleEngine };

        const serviceBeforeCrash = new WorldCommitService();
        const committed = await serviceBeforeCrash.commitManifest(input);
        const stateBeforeCrash = await readState(db, fixture);

        scenario.event(
          "process.crash.simulated",
          `Commit ${committed.commitId} reached durable storage; application DB clients are now discarded without any in-memory handoff.`,
        );

        await disconnect();
        await connect(databaseUrl);
        if (!db) throw new Error("RESTART_DB_RECONNECT_FAILED");

        const stateAfterRestart = await readState(db, fixture);
        const serviceAfterRestart = new WorldCommitService();
        const replayed = await serviceAfterRestart.commitManifest(input);
        const stateAfterReplay = await readState(db, fixture);

        const durableAcrossRestart =
          stateAfterRestart.commitCount === stateBeforeCrash.commitCount &&
          stateAfterRestart.worldVersionCount ===
            stateBeforeCrash.worldVersionCount &&
          stateAfterRestart.worldVersion === stateBeforeCrash.worldVersion &&
          stateAfterRestart.eventCount === stateBeforeCrash.eventCount &&
          stateAfterRestart.outboxCount === stateBeforeCrash.outboxCount &&
          stateAfterRestart.pendingOutboxCount ===
            stateBeforeCrash.pendingOutboxCount;
        const replayUsedPersistedIdempotency =
          replayed.commitId === committed.commitId &&
          stateAfterReplay.commitCount === stateAfterRestart.commitCount &&
          stateAfterReplay.worldVersionCount ===
            stateAfterRestart.worldVersionCount &&
          stateAfterReplay.worldVersion === stateAfterRestart.worldVersion &&
          stateAfterReplay.eventCount === stateAfterRestart.eventCount &&
          stateAfterReplay.outboxCount === stateAfterRestart.outboxCount;
        const pendingWorkSurvived =
          stateBeforeCrash.pendingOutboxCount >= 1 &&
          stateAfterRestart.pendingOutboxCount ===
            stateBeforeCrash.pendingOutboxCount;

        scenario.event(
          "process.restart.completed",
          `Fresh DB clients recovered commit ${replayed.commitId}; world version remained ${stateAfterReplay.worldVersion}.`,
        );
        scenario.assert(
          "Committed DB state survived restart unchanged",
          durableAcrossRestart,
          stateBeforeCrash,
          stateAfterRestart,
        );
        scenario.assert(
          "Pending outbox work survived restart",
          pendingWorkSurvived,
          stateBeforeCrash.pendingOutboxCount,
          stateAfterRestart.pendingOutboxCount,
        );
        scenario.assert(
          "Replay after restart reused the persisted commit",
          replayUsedPersistedIdempotency,
          committed.commitId,
          replayed.commitId,
        );

        const passed =
          durableAcrossRestart &&
          pendingWorkSurvived &&
          replayUsedPersistedIdempotency;
        const report = scenario.finish({
          result: passed ? "PASS" : "FAIL",
          reason: passed
            ? "Durable commit, pending outbox work, and idempotency state survived a full application DB-client restart without duplicate mutation."
            : "One or more crash/restart recovery invariants failed.",
        });
        await writeScenarioArtifacts(report, {
          environment: "disposable-postgres-l9-crash-recovery",
        });
        expect(report.result).toBe("PASS");
      } finally {
        if (!db) await connect(databaseUrl);
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
        await cleanupStoryFixture(pool, fixture);
      }
    },
  );
});
