import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  advanceSession,
  completeSession,
} from "../../src/application/story-session.service";
import { createScenario } from "../../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../../tooling/ultef/src/artifacts.mjs";
import { cleanupStoryFixture, seedStoryFixture } from "./ultef-fixtures";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const enabled = process.env.ULTEF_SCENARIO === "L3-SESSION-NEGATIVE";
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

const nextSceneId = crypto.randomUUID();
let pool: pg.Pool | null = null;

async function readProtectedState(db: pg.Pool) {
  const session = await db.query<{
    version: number;
    current_scene_id: string | null;
    session_status: string;
  }>(
    `SELECT version, current_scene_id, session_status
       FROM story.story_sessions
      WHERE id = $1`,
    [ids.storySessionId],
  );
  const visits = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM story.story_session_scene_visits
      WHERE story_session_id = $1`,
    [ids.storySessionId],
  );
  const checkpoints = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM story.story_session_checkpoints
      WHERE story_session_id = $1`,
    [ids.storySessionId],
  );
  const events = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM story.story_event_store
      WHERE story_session_id = $1`,
    [ids.storySessionId],
  );

  return {
    version: session.rows[0]?.version ?? null,
    currentSceneId: session.rows[0]?.current_scene_id ?? null,
    sessionStatus: session.rows[0]?.session_status ?? null,
    visitCount: Number(visits.rows[0]?.count ?? 0),
    checkpointCount: Number(checkpoints.rows[0]?.count ?? 0),
    eventCount: Number(events.rows[0]?.count ?? 0),
  };
}

describeDb("ULTEF Sprint 01 — session negative paths", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) return;
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    await seedStoryFixture(pool, ids);
    await pool.query(
      `INSERT INTO story.story_scenes (
         id, story_version_id, scene_key, sequence_number, scene_type, title,
         narrative_text, is_entry_scene, is_terminal_scene, metadata
       ) VALUES ($1, $2, 'negative-target', 1, 'narrative', 'Negative Target',
         'Bu sahne reddedilen gecislerde asla ziyaret edilmemeli.', FALSE, FALSE, '{}'::jsonb)`,
      [nextSceneId, ids.storyVersionId],
    );
  });

  afterAll(async () => {
    if (!pool) return;
    await cleanupStoryFixture(pool, ids);
    await pool.end();
  });

  it("L3-SESSION-001 rejects stale expectedVersion without leaking any session mutation", async () => {
    if (!pool) throw new Error("DATABASE_URL_REQUIRED");

    const scenario = createScenario({
      id: "L3-SESSION-001",
      title: "Stale session version is rejected without persistence leak",
      level: "L3",
      projectGate: "PX-LUMI-01",
      seed: "runtime-uuid",
    });

    scenario.setup("Child", { id: ids.childProfileId, name: "Deniz" });
    scenario.setup("Character", { id: ids.characterId, name: "Arin" });
    scenario.setup("Protected session", {
      id: ids.storySessionId,
      expectedVersion: 1,
    });
    scenario.setup("Attempted target scene", {
      id: nextSceneId,
      title: "Negative Target",
    });

    const before = await readProtectedState(pool);
    let rejected = false;
    let rejection = "";

    try {
      await advanceSession({
        sessionId: ids.storySessionId,
        expectedVersion: 0,
        nextSceneId,
        idempotencyKey: `ultef-stale:${ids.storySessionId}`,
      });
    } catch (error) {
      rejected = true;
      rejection = error instanceof Error ? error.message : String(error);
    }

    const after = await readProtectedState(pool);

    scenario.event(
      "session.advance.stale",
      rejected
        ? `Arin icin session advance stale expectedVersion=0 ile denendi ve reddedildi: ${rejection}`
        : "Stale session advance beklenmedik sekilde kabul edildi.",
      { rejected, actualVersion: before.version },
    );
    scenario.event(
      "protected-state.reload",
      "Session, visit, checkpoint ve event sayilari PostgreSQL'den yeniden okundu.",
    );

    const assertions = {
      rejected,
      versionUnchanged: before.version === after.version,
      sceneUnchanged: before.currentSceneId === after.currentSceneId,
      visitsUnchanged: before.visitCount === after.visitCount,
      checkpointsUnchanged: before.checkpointCount === after.checkpointCount,
      eventsUnchanged: before.eventCount === after.eventCount,
    };

    scenario.assert(
      "Stale expectedVersion is rejected",
      assertions.rejected,
      true,
      rejected,
    );
    scenario.assert(
      "Session version did not change",
      assertions.versionUnchanged,
      before.version,
      after.version,
    );
    scenario.assert(
      "Current scene did not change",
      assertions.sceneUnchanged,
      before.currentSceneId,
      after.currentSceneId,
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

    scenario.delta(
      "story.session.version",
      before.version,
      after.version,
      "rejected stale transition",
    );
    scenario.delta(
      "story.session.currentSceneId",
      before.currentSceneId,
      after.currentSceneId,
      "rejected stale transition",
    );
    scenario.delta(
      "story.session.visitCount",
      before.visitCount,
      after.visitCount,
      "no-leak verification",
    );
    scenario.delta(
      "story.session.checkpointCount",
      before.checkpointCount,
      after.checkpointCount,
      "no-leak verification",
    );
    scenario.delta(
      "story.session.eventCount",
      before.eventCount,
      after.eventCount,
      "no-leak verification",
    );

    const passed = Object.values(assertions).every(Boolean);
    const report = scenario.finish({
      result: passed ? "PASS" : "FAIL",
      reason: passed
        ? "Stale session transition was rejected and no protected session state leaked into persistence."
        : "Stale session rejection or no-leak assertions failed.",
    });
    await writeScenarioArtifacts(report, { environment: "integration" });
    expect(report.result).toBe("PASS");
  });

  it("L3-SESSION-002 rejects advance after completion without leaking new state", async () => {
    if (!pool) throw new Error("DATABASE_URL_REQUIRED");

    const active = await readProtectedState(pool);
    if (active.sessionStatus !== "active" || active.version !== 1) {
      throw new Error("SESSION_FIXTURE_NOT_ACTIVE");
    }

    await completeSession({
      sessionId: ids.storySessionId,
      expectedVersion: 1,
      idempotencyKey: `ultef-complete:${ids.storySessionId}`,
    });

    const scenario = createScenario({
      id: "L3-SESSION-002",
      title:
        "Completed session cannot advance and produces no persistence leak",
      level: "L3",
      projectGate: "PX-LUMI-01",
      seed: "runtime-uuid",
    });

    const before = await readProtectedState(pool);
    scenario.setup("Child", { id: ids.childProfileId, name: "Deniz" });
    scenario.setup("Character", { id: ids.characterId, name: "Arin" });
    scenario.setup("Completed session", {
      id: ids.storySessionId,
      version: before.version,
      status: before.sessionStatus,
    });
    scenario.setup("Attempted target scene", {
      id: nextSceneId,
      title: "Negative Target",
    });

    let rejected = false;
    let rejection = "";
    try {
      await advanceSession({
        sessionId: ids.storySessionId,
        expectedVersion: before.version ?? 2,
        nextSceneId,
        idempotencyKey: `ultef-completed-advance:${ids.storySessionId}`,
      });
    } catch (error) {
      rejected = true;
      rejection = error instanceof Error ? error.message : String(error);
    }

    const after = await readProtectedState(pool);

    scenario.event(
      "session.advance.completed",
      rejected
        ? `Tamamlanmis hikaye oturumu yeniden ilerletilmeye calisildi ve reddedildi: ${rejection}`
        : "Tamamlanmis hikaye oturumu beklenmedik sekilde ilerletildi.",
      { rejected, status: before.sessionStatus, version: before.version },
    );
    scenario.event(
      "protected-state.reload",
      "Reddedilen tamamlanmis-session gecisinden sonra session state ve yan etkiler PostgreSQL'den yeniden okundu.",
    );

    const assertions = {
      completedBeforeAttempt: before.sessionStatus === "completed",
      rejected,
      statusUnchanged: after.sessionStatus === "completed",
      versionUnchanged: before.version === after.version,
      sceneUnchanged: before.currentSceneId === after.currentSceneId,
      visitsUnchanged: before.visitCount === after.visitCount,
      checkpointsUnchanged: before.checkpointCount === after.checkpointCount,
      eventsUnchanged: before.eventCount === after.eventCount,
    };

    scenario.assert(
      "Session was completed before the forbidden advance",
      assertions.completedBeforeAttempt,
      "completed",
      before.sessionStatus,
    );
    scenario.assert(
      "Completed session advance is rejected",
      assertions.rejected,
      true,
      rejected,
    );
    scenario.assert(
      "Session remains completed",
      assertions.statusUnchanged,
      "completed",
      after.sessionStatus,
    );
    scenario.assert(
      "Session version did not change after rejected advance",
      assertions.versionUnchanged,
      before.version,
      after.version,
    );
    scenario.assert(
      "Current scene did not change after rejected advance",
      assertions.sceneUnchanged,
      before.currentSceneId,
      after.currentSceneId,
    );
    scenario.assert(
      "No new scene visit leaked",
      assertions.visitsUnchanged,
      before.visitCount,
      after.visitCount,
    );
    scenario.assert(
      "No new checkpoint leaked",
      assertions.checkpointsUnchanged,
      before.checkpointCount,
      after.checkpointCount,
    );
    scenario.assert(
      "No new story event leaked",
      assertions.eventsUnchanged,
      before.eventCount,
      after.eventCount,
    );

    scenario.delta(
      "story.session.status",
      before.sessionStatus,
      after.sessionStatus,
      "rejected advance after completion",
    );
    scenario.delta(
      "story.session.version",
      before.version,
      after.version,
      "rejected advance after completion",
    );
    scenario.delta(
      "story.session.visitCount",
      before.visitCount,
      after.visitCount,
      "no-leak verification",
    );
    scenario.delta(
      "story.session.checkpointCount",
      before.checkpointCount,
      after.checkpointCount,
      "no-leak verification",
    );
    scenario.delta(
      "story.session.eventCount",
      before.eventCount,
      after.eventCount,
      "no-leak verification",
    );

    const passed = Object.values(assertions).every(Boolean);
    const report = scenario.finish({
      result: passed ? "PASS" : "FAIL",
      reason: passed
        ? "Completed session rejected a later advance and persistence remained unchanged after the rejected operation."
        : "Completed-session rejection or no-leak assertions failed.",
    });
    await writeScenarioArtifacts(report, { environment: "integration" });
    expect(report.result).toBe("PASS");
  });
});
