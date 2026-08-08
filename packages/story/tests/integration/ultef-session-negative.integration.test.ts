import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

import { advanceSession } from "../../src/application/story-session.service";
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
  }>(
    `SELECT version, current_scene_id
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
       ) VALUES ($1, $2, 'stale-target', 1, 'narrative', 'Stale Target',
         'Bu sahne stale version denemesinde asla ziyaret edilmemeli.', FALSE, FALSE, '{}'::jsonb)`,
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
      title: "Stale Target",
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
});
