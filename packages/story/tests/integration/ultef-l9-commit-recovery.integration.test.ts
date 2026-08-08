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

const enabled = process.env.ULTEF_SCENARIO === "L9-COMMIT-RECOVERY-001";
const hasDatabase = Boolean(process.env.STORY_TEST_DATABASE_URL);
const describeDb = enabled && hasDatabase ? describe : describe.skip;

let queryClient: ReturnType<typeof postgres> | null = null;
let db: Database | null = null;
let pool: pg.Pool | null = null;

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
  };
}

describeDb("ULTEF L9 — commit recovery", () => {
  beforeAll(async () => {
    const url = process.env.STORY_TEST_DATABASE_URL;
    if (!url) return;
    queryClient = postgres(url, { max: 2 });
    db = drizzle(queryClient, { schema });
    pool = new pg.Pool({ connectionString: url });
    __setTestCommitDb(db);
  });

  afterAll(async () => {
    __setTestCommitDb(undefined);
    if (queryClient) await queryClient.end();
    if (pool) await pool.end();
  });

  it("L9-COMMIT-RECOVERY-001 rolls back a failed attempt, then recovers exactly once", async () => {
    if (!db || !pool) throw new Error("STORY_TEST_DATABASE_URL_REQUIRED");

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
    const knownNpcId = crypto.randomUUID();
    const unknownNpcId = crypto.randomUUID();
    await seedStoryFixture(pool, fixture);

    try {
      const scenario = createScenario({
        id: "L9-COMMIT-RECOVERY-001",
        title: "Failed world commit recovers without duplicate mutation",
        level: "L9",
        projectGate: "L9-G2",
        seed: "runtime-uuid",
      });
      scenario.setup("Household", fixture.householdId);
      scenario.setup("World", fixture.worldId);
      scenario.setup("Session", fixture.storySessionId);
      scenario.setup("Known NPC", knownNpcId);

      const service = new WorldCommitService();
      const extractor = new NarrativeEventExtractor();
      const validator = new EvidenceValidator();
      const ruleEngine = new WorldCommitRuleEngine({
        rules: defaultOutcomeRules(),
      });

      const snapshot = StoryContextSnapshot.create({
        storySessionId: fixture.storySessionId,
        householdId: fixture.householdId,
        worldId: fixture.worldId,
        worldStateHash: "l9-recovery-before",
        entities: [
          {
            entityId: knownNpcId,
            entityKind: "npc",
            state: { need: { hunger: 40 } },
            stateHash: "l9-known-npc-before",
          },
        ],
      });

      const invalidManifest = OutcomeManifest.create({
        storySessionId: fixture.storySessionId,
        householdId: fixture.householdId,
        worldId: fixture.worldId,
        source: "story_session",
        sourceSceneId: "l9-recovery-scene",
        changes: [
          {
            key: "l9-invalid-unknown-npc",
            outcomeType: "npc_state_update",
            entityId: unknownNpcId,
            operation: "set",
            field: "need.hunger",
            value: 99,
            evidenceRef: "scene://l9/recovery#invalid",
          },
        ],
      });

      const before = await readState(db, fixture);
      let failed = false;
      let failureMessage = "";
      try {
        await service.commitManifest({
          manifest: invalidManifest,
          snapshot,
          extractor,
          validator,
          ruleEngine,
        });
      } catch (error) {
        failed = true;
        failureMessage = error instanceof Error ? error.message : String(error);
      }
      const afterFailure = await readState(db, fixture);

      scenario.event(
        "world.commit.failed",
        failed
          ? `Injected invalid outcome was rejected: ${failureMessage}`
          : "Invalid outcome unexpectedly committed.",
      );

      const validManifest = OutcomeManifest.create({
        storySessionId: fixture.storySessionId,
        householdId: fixture.householdId,
        worldId: fixture.worldId,
        source: "story_session",
        sourceSceneId: "l9-recovery-scene",
        changes: [
          {
            key: "l9-recovered-known-npc",
            outcomeType: "npc_state_update",
            entityId: knownNpcId,
            operation: "set",
            field: "need.hunger",
            value: 65,
            evidenceRef: "scene://l9/recovery#valid",
          },
        ],
      });

      const commitInput = {
        manifest: validManifest,
        snapshot,
        extractor,
        validator,
        ruleEngine,
      };
      const recovered = await service.commitManifest(commitInput);
      const afterRecovery = await readState(db, fixture);
      const replayed = await service.commitManifest(commitInput);
      const afterReplay = await readState(db, fixture);

      scenario.event(
        "world.commit.recovered",
        `Corrected outcome committed once as ${recovered.commitId}; world version ${recovered.worldVersionBefore} -> ${recovered.worldVersionAfter}.`,
      );
      scenario.event(
        "world.commit.replayed",
        `The same recovered manifest was replayed and returned commit ${replayed.commitId}.`,
      );

      const failureWasAtomic =
        afterFailure.commitCount === before.commitCount &&
        afterFailure.worldVersionCount === before.worldVersionCount &&
        afterFailure.eventCount === before.eventCount &&
        afterFailure.outboxCount === before.outboxCount;
      const recoveryCommittedOnce =
        afterRecovery.commitCount === before.commitCount + 1 &&
        afterRecovery.worldVersionCount === before.worldVersionCount + 1 &&
        afterRecovery.eventCount === before.eventCount + 1 &&
        afterRecovery.outboxCount >= before.outboxCount + 1;
      const replayWasIdempotent =
        replayed.commitId === recovered.commitId &&
        afterReplay.commitCount === afterRecovery.commitCount &&
        afterReplay.worldVersionCount === afterRecovery.worldVersionCount &&
        afterReplay.eventCount === afterRecovery.eventCount &&
        afterReplay.outboxCount === afterRecovery.outboxCount;

      scenario.assert("Injected failure was rejected", failed, true, failed);
      scenario.assert(
        "Failed commit left no persistent side effects",
        failureWasAtomic,
        before,
        afterFailure,
      );
      scenario.assert(
        "Corrected retry committed exactly once",
        recoveryCommittedOnce,
        {
          commitCount: before.commitCount + 1,
          worldVersionCount: before.worldVersionCount + 1,
          eventCount: before.eventCount + 1,
        },
        afterRecovery,
      );
      scenario.assert(
        "Replay reused recovered commit without duplicate mutation",
        replayWasIdempotent,
        recovered.commitId,
        replayed.commitId,
      );

      scenario.delta(
        "story.commit.count",
        before.commitCount,
        afterReplay.commitCount,
        "one successful recovery after one failed attempt and one replay",
      );
      scenario.delta(
        "story.worldVersion.count",
        before.worldVersionCount,
        afterReplay.worldVersionCount,
        "failed attempt contributes zero versions; recovered attempt contributes one",
      );

      const passed =
        failed &&
        failureWasAtomic &&
        recoveryCommittedOnce &&
        replayWasIdempotent;
      const report = scenario.finish({
        result: passed ? "PASS" : "FAIL",
        reason: passed
          ? "The failed commit was atomic, the corrected retry committed exactly once, and replay remained idempotent."
          : "One or more L9 commit-recovery assertions failed.",
      });
      await writeScenarioArtifacts(report, { environment: "integration" });
      expect(report.result).toBe("PASS");
    } finally {
      await pool.query(
        `DELETE FROM story.story_outbox WHERE household_id = $1`,
        [fixture.householdId],
      );
      await pool.query(
        `DELETE FROM story.story_commit_records WHERE household_id = $1`,
        [fixture.householdId],
      );
      await pool.query(
        `DELETE FROM story.story_world_versions WHERE household_id = $1`,
        [fixture.householdId],
      );
      await cleanupStoryFixture(pool, fixture);
    }
  });
});
