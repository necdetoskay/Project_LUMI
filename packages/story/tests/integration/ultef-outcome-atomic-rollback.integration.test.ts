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
  __setTestSessionDb,
  advanceSession,
} from "../../src/application/story-session.service";
import { createScenario } from "../../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../../tooling/ultef/src/artifacts.mjs";
import { cleanupStoryFixture, seedStoryFixture } from "./ultef-fixtures";

const enabled = process.env.ULTEF_SCENARIO === "L4-OUTCOME-ATOMIC-ROLLBACK";
const hasDatabase = Boolean(process.env.STORY_TEST_DATABASE_URL);
const describeDb = enabled && hasDatabase ? describe : describe.skip;

let queryClient: ReturnType<typeof postgres> | null = null;
let db: Database | null = null;
let pool: pg.Pool | null = null;

async function readState(database: Database, fixture: {
  householdId: string;
  worldId: string;
  storySessionId: string;
  manifestId: string;
}) {
  const sessions = await database
    .select()
    .from(schema.storySessions)
    .where(eq(schema.storySessions.id, fixture.storySessionId));
  const visits = await database
    .select()
    .from(schema.storySessionSceneVisits)
    .where(eq(schema.storySessionSceneVisits.storySessionId, fixture.storySessionId));
  const checkpoints = await database
    .select()
    .from(schema.storySessionCheckpoints)
    .where(eq(schema.storySessionCheckpoints.storySessionId, fixture.storySessionId));
  const events = await database
    .select()
    .from(schema.storyEventStore)
    .where(eq(schema.storyEventStore.storySessionId, fixture.storySessionId));
  const commits = await database
    .select()
    .from(schema.storyCommitRecords)
    .where(eq(schema.storyCommitRecords.manifestId, fixture.manifestId));
  const worldVersions = await database
    .select()
    .from(schema.storyWorldVersions)
    .where(
      and(
        eq(schema.storyWorldVersions.householdId, fixture.householdId),
        eq(schema.storyWorldVersions.worldId, fixture.worldId),
      ),
    );
  const outbox = await database
    .select()
    .from(schema.storyOutbox)
    .where(eq(schema.storyOutbox.householdId, fixture.householdId));

  return {
    sessionVersion: sessions[0]?.version ?? null,
    currentSceneId: sessions[0]?.currentSceneId ?? null,
    visitCount: visits.length,
    checkpointCount: checkpoints.length,
    eventCount: events.length,
    commitCount: commits.length,
    worldVersionCount: worldVersions.length,
    outboxCount: outbox.length,
  };
}

describeDb("ULTEF Sprint 01 — atomic outcome rollback", () => {
  beforeAll(async () => {
    const url = process.env.STORY_TEST_DATABASE_URL;
    if (!url) return;
    queryClient = postgres(url, { max: 2 });
    db = drizzle(queryClient, { schema });
    pool = new pg.Pool({ connectionString: url });
    __setTestSessionDb(db);
  });

  afterAll(async () => {
    __setTestSessionDb(undefined);
    if (queryClient) await queryClient.end();
    if (pool) await pool.end();
  });

  it(
    "L4-OUTCOME-ROLLBACK-001 rolls back session advance when outcome validation fails",
    async () => {
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
      const targetSceneId = crypto.randomUUID();
      const knownNpcId = crypto.randomUUID();
      const unknownNpcId = crypto.randomUUID();
      await seedStoryFixture(pool, fixture);
      await pool.query(
        `INSERT INTO story.story_scenes (
           id, story_version_id, scene_key, sequence_number, scene_type, title,
           narrative_text, is_entry_scene, is_terminal_scene, metadata
         ) VALUES ($1, $2, 'rollback-target', 1, 'narrative', 'Rollback Target',
           'Bu sahne outcome reddedilirse kalici hale gelmemeli.', FALSE, FALSE, '{}'::jsonb)`,
        [targetSceneId, fixture.storyVersionId],
      );

      const manifest = OutcomeManifest.create({
        storySessionId: fixture.storySessionId,
        householdId: fixture.householdId,
        worldId: fixture.worldId,
        source: "story_session",
        sourceSceneId: targetSceneId,
        changes: [
          {
            key: "rollback-invalid-target",
            outcomeType: "npc_state_update",
            entityId: unknownNpcId,
            operation: "set",
            field: "need.hunger",
            value: 99,
            evidenceRef: "scene://ultef/rollback-target#1",
          },
        ],
      });
      const snapshot = StoryContextSnapshot.create({
        storySessionId: fixture.storySessionId,
        householdId: fixture.householdId,
        worldId: fixture.worldId,
        worldStateHash: "ultef-rollback-before",
        entities: [
          {
            entityId: knownNpcId,
            entityKind: "npc",
            state: { need: { hunger: 40 } },
            stateHash: "ultef-known-before",
          },
        ],
      });

      const scenario = createScenario({
        id: "L4-OUTCOME-ROLLBACK-001",
        title: "Rejected outcome rolls back the enclosing session advance",
        level: "L4",
        projectGate: "PX-LUMI-09",
        seed: "runtime-uuid",
      });
      scenario.setup("Child", { id: fixture.childProfileId, name: "Deniz" });
      scenario.setup("Character", { id: fixture.characterId, name: "Arin" });
      scenario.setup("Session", {
        id: fixture.storySessionId,
        version: 1,
        currentSceneId: fixture.entrySceneId,
      });
      scenario.setup("Attempted target scene", { id: targetSceneId });

      const before = await readState(db, {
        householdId: fixture.householdId,
        worldId: fixture.worldId,
        storySessionId: fixture.storySessionId,
        manifestId: manifest.id,
      });

      let rejected = false;
      let rejection = "";
      try {
        await advanceSession({
          sessionId: fixture.storySessionId,
          expectedVersion: 1,
          nextSceneId: targetSceneId,
          idempotencyKey: `ultef-rollback:${fixture.storySessionId}`,
          outcome: {
            manifest,
            snapshot,
            extractor: new NarrativeEventExtractor(),
            validator: new EvidenceValidator(),
            ruleEngine: new WorldCommitRuleEngine({
              rules: defaultOutcomeRules(),
            }),
          },
        });
      } catch (error) {
        rejected = true;
        rejection = error instanceof Error ? error.message : String(error);
      }

      const after = await readState(db, {
        householdId: fixture.householdId,
        worldId: fixture.worldId,
        storySessionId: fixture.storySessionId,
        manifestId: manifest.id,
      });

      scenario.event(
        "session.advance.with-invalid-outcome",
        "Arin hedef sahneye ilerletilmeye calisildi; ayni transaction icindeki outcome snapshot'ta olmayan NPC'yi degistirmeye calisti.",
      );
      scenario.event(
        "transaction.rejected",
        rejected
          ? `Outcome validation transaction'i reddetti: ${rejection}`
          : "Transaction beklenmedik sekilde kabul edildi.",
      );
      scenario.event(
        "transaction.reload",
        "Session ve world yan etkileri PostgreSQL'den yeniden okundu.",
      );

      const assertions = {
        rejected,
        evidenceFailure: rejection.includes("EVIDENCE_VALIDATION_FAILED"),
        versionRolledBack: after.sessionVersion === before.sessionVersion,
        sceneRolledBack: after.currentSceneId === before.currentSceneId,
        visitsRolledBack: after.visitCount === before.visitCount,
        checkpointsRolledBack: after.checkpointCount === before.checkpointCount,
        eventsRolledBack: after.eventCount === before.eventCount,
        commitsRolledBack: after.commitCount === before.commitCount,
        worldVersionRolledBack:
          after.worldVersionCount === before.worldVersionCount,
        outboxRolledBack: after.outboxCount === before.outboxCount,
      };

      scenario.assert("Invalid outcome rejected", rejected, true, rejected);
      scenario.assert(
        "Session version rolled back",
        assertions.versionRolledBack,
        before.sessionVersion,
        after.sessionVersion,
      );
      scenario.assert(
        "Current scene rolled back",
        assertions.sceneRolledBack,
        before.currentSceneId,
        after.currentSceneId,
      );
      scenario.assert(
        "Scene visits rolled back",
        assertions.visitsRolledBack,
        before.visitCount,
        after.visitCount,
      );
      scenario.assert(
        "Checkpoints rolled back",
        assertions.checkpointsRolledBack,
        before.checkpointCount,
        after.checkpointCount,
      );
      scenario.assert(
        "Story events rolled back",
        assertions.eventsRolledBack,
        before.eventCount,
        after.eventCount,
      );
      scenario.assert(
        "World commit did not persist",
        assertions.commitsRolledBack,
        before.commitCount,
        after.commitCount,
      );
      scenario.assert(
        "World version did not persist",
        assertions.worldVersionRolledBack,
        before.worldVersionCount,
        after.worldVersionCount,
      );
      scenario.assert(
        "Outbox intent did not persist",
        assertions.outboxRolledBack,
        before.outboxCount,
        after.outboxCount,
      );

      scenario.delta(
        "story.session.version",
        before.sessionVersion,
        after.sessionVersion,
        "failed outcome rolls back enclosing advance",
      );
      scenario.delta(
        "story.session.currentSceneId",
        before.currentSceneId,
        after.currentSceneId,
        "failed outcome rolls back enclosing advance",
      );
      scenario.delta(
        "story.worldVersion.count",
        before.worldVersionCount,
        after.worldVersionCount,
        "failed outcome rolls back enclosing advance",
      );

      const passed = Object.values(assertions).every(Boolean);
      const report = scenario.finish({
        result: passed ? "PASS" : "FAIL",
        reason: passed
          ? "Outcome validation failed and the enclosing PostgreSQL transaction rolled back the session advance plus all world side effects."
          : "One or more atomic rollback assertions failed.",
      });
      await writeScenarioArtifacts(report, { environment: "integration" });
      expect(report.result).toBe("PASS");

      await cleanupStoryFixture(pool, fixture);
    },
  );
});
