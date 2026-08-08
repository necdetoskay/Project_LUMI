import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { startSession } from "../../src/application/story-session.service";
import { createScenario } from "../../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../../tooling/ultef/src/artifacts.mjs";
import { cleanupStoryFixture, seedStoryFixture } from "./ultef-fixtures";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const enabled = process.env.ULTEF_SCENARIO === "L3-SESSION-003";
const describeDb = hasDatabase && enabled ? describe : describe.skip;

const ids = {
  householdId: crypto.randomUUID(),
  childProfileId: crypto.randomUUID(),
  characterId: crypto.randomUUID(),
  worldId: crypto.randomUUID(),
  storyDefinitionId: crypto.randomUUID(),
  storyVersionId: crypto.randomUUID(),
  entrySceneId: crypto.randomUUID(),
  storySessionId: crypto.randomUUID(),
};

let pool: pg.Pool | null = null;

async function readChildWorldState(db: pg.Pool) {
  const sessions = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM story.story_sessions
      WHERE child_profile_id = $1 AND world_id = $2`,
    [ids.childProfileId, ids.worldId],
  );
  const activeSessions = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM story.story_sessions
      WHERE child_profile_id = $1
        AND world_id = $2
        AND session_status IN ('active', 'paused')`,
    [ids.childProfileId, ids.worldId],
  );
  const visits = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM story.story_session_scene_visits v
       JOIN story.story_sessions s ON s.id = v.story_session_id
      WHERE s.child_profile_id = $1 AND s.world_id = $2`,
    [ids.childProfileId, ids.worldId],
  );
  const checkpoints = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM story.story_session_checkpoints c
       JOIN story.story_sessions s ON s.id = c.story_session_id
      WHERE s.child_profile_id = $1 AND s.world_id = $2`,
    [ids.childProfileId, ids.worldId],
  );
  const events = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM story.story_event_store e
       JOIN story.story_sessions s ON s.id = e.story_session_id
      WHERE s.child_profile_id = $1 AND s.world_id = $2`,
    [ids.childProfileId, ids.worldId],
  );
  const ledger = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM story.story_idempotency_ledger l
       JOIN story.story_sessions s ON s.id = l.story_session_id
      WHERE s.child_profile_id = $1 AND s.world_id = $2`,
    [ids.childProfileId, ids.worldId],
  );

  return {
    sessionCount: Number(sessions.rows[0]?.count ?? 0),
    activeSessionCount: Number(activeSessions.rows[0]?.count ?? 0),
    visitCount: Number(visits.rows[0]?.count ?? 0),
    checkpointCount: Number(checkpoints.rows[0]?.count ?? 0),
    eventCount: Number(events.rows[0]?.count ?? 0),
    ledgerCount: Number(ledger.rows[0]?.count ?? 0),
  };
}

describeDb("ULTEF Sprint 01 — single active session guard", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) return;
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    await seedStoryFixture(pool, ids);
  });

  afterAll(async () => {
    if (!pool) return;
    await cleanupStoryFixture(pool, ids);
    await pool.end();
  });

  it("L3-SESSION-003 rejects a second active session for the same child and world without persistence leak", async () => {
    if (!pool) throw new Error("DATABASE_URL_REQUIRED");

    const scenario = createScenario({
      id: "L3-SESSION-003",
      title:
        "Second active child/world session is rejected without persistence leak",
      level: "L3",
      projectGate: "PX-LUMI-01",
      seed: "runtime-uuid",
    });

    scenario.setup("Child", { id: ids.childProfileId, name: "Deniz" });
    scenario.setup("Character", { id: ids.characterId, name: "Arin" });
    scenario.setup("World", { id: ids.worldId, name: "Gunes Vadisi" });
    scenario.setup("Existing active session", { id: ids.storySessionId });

    const before = await readChildWorldState(pool);
    const duplicateKey = `ultef-second-active:${ids.childProfileId}:${ids.worldId}`;
    let rejected = false;
    let rejection = "";

    try {
      await startSession({
        householdId: ids.householdId,
        childProfileId: ids.childProfileId,
        worldId: ids.worldId,
        storyDefinitionId: ids.storyDefinitionId,
        storyVersionId: ids.storyVersionId,
        characterId: ids.characterId,
        idempotencyKey: duplicateKey,
      });
    } catch (error) {
      rejected = true;
      rejection = error instanceof Error ? error.message : String(error);
    }

    const after = await readChildWorldState(pool);

    scenario.event(
      "session.start.second-active",
      rejected
        ? `Deniz ve Arin icin ayni dunyada ikinci aktif hikaye oturumu acilmak istendi ve reddedildi: ${rejection}`
        : "Ayni child/world icin ikinci aktif hikaye oturumu beklenmedik sekilde acildi.",
      { rejected },
    );
    scenario.event(
      "protected-state.reload",
      "Child/world session, visit, checkpoint, event ve idempotency sayilari PostgreSQL'den yeniden okundu.",
    );

    const assertions = {
      rejected,
      oneSessionBefore: before.sessionCount === 1,
      oneActiveBefore: before.activeSessionCount === 1,
      sessionCountUnchanged: before.sessionCount === after.sessionCount,
      activeCountUnchanged:
        before.activeSessionCount === after.activeSessionCount,
      visitsUnchanged: before.visitCount === after.visitCount,
      checkpointsUnchanged: before.checkpointCount === after.checkpointCount,
      eventsUnchanged: before.eventCount === after.eventCount,
      ledgerUnchanged: before.ledgerCount === after.ledgerCount,
    };

    scenario.assert(
      "Second active session start is rejected",
      assertions.rejected,
      true,
      rejected,
    );
    scenario.assert(
      "Fixture had exactly one session before attempt",
      assertions.oneSessionBefore,
      1,
      before.sessionCount,
    );
    scenario.assert(
      "Fixture had exactly one active session before attempt",
      assertions.oneActiveBefore,
      1,
      before.activeSessionCount,
    );
    scenario.assert(
      "No second session was persisted",
      assertions.sessionCountUnchanged,
      before.sessionCount,
      after.sessionCount,
    );
    scenario.assert(
      "Active session count did not change",
      assertions.activeCountUnchanged,
      before.activeSessionCount,
      after.activeSessionCount,
    );
    scenario.assert(
      "No scene visit leaked",
      assertions.visitsUnchanged,
      before.visitCount,
      after.visitCount,
    );
    scenario.assert(
      "No checkpoint leaked",
      assertions.checkpointsUnchanged,
      before.checkpointCount,
      after.checkpointCount,
    );
    scenario.assert(
      "No story event leaked",
      assertions.eventsUnchanged,
      before.eventCount,
      after.eventCount,
    );
    scenario.assert(
      "No idempotency ledger row leaked",
      assertions.ledgerUnchanged,
      before.ledgerCount,
      after.ledgerCount,
    );

    scenario.delta(
      "childWorld.sessionCount",
      before.sessionCount,
      after.sessionCount,
      "rejected second active session",
    );
    scenario.delta(
      "childWorld.activeSessionCount",
      before.activeSessionCount,
      after.activeSessionCount,
      "rejected second active session",
    );
    scenario.delta(
      "childWorld.visitCount",
      before.visitCount,
      after.visitCount,
      "no-leak verification",
    );
    scenario.delta(
      "childWorld.checkpointCount",
      before.checkpointCount,
      after.checkpointCount,
      "no-leak verification",
    );
    scenario.delta(
      "childWorld.eventCount",
      before.eventCount,
      after.eventCount,
      "no-leak verification",
    );
    scenario.delta(
      "childWorld.idempotencyLedgerCount",
      before.ledgerCount,
      after.ledgerCount,
      "no-leak verification",
    );

    const passed = Object.values(assertions).every(Boolean);
    const report = scenario.finish({
      result: passed ? "PASS" : "FAIL",
      reason: passed
        ? "The existing active child/world session blocked a second start and no persistence side effect was created."
        : "Second active session rejection or no-leak assertions failed.",
    });
    await writeScenarioArtifacts(report, { environment: "integration" });
    expect(report.result).toBe("PASS");
  });
});
