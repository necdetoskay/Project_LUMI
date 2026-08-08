import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { advanceSession } from "../../src/application/story-session.service";
import { createScenario } from "../../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../../tooling/ultef/src/artifacts.mjs";
import { cleanupStoryFixture, seedStoryFixture } from "./ultef-fixtures";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const enabled = process.env.ULTEF_SCENARIO === "L3-SESSION-IDEMPOTENCY";
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

async function readState(db: pg.Pool) {
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
  const ledger = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM story.story_idempotency_ledger
      WHERE story_session_id = $1
        AND operation_type = 'session_advance'`,
    [ids.storySessionId],
  );

  return {
    version: session.rows[0]?.version ?? null,
    currentSceneId: session.rows[0]?.current_scene_id ?? null,
    visitCount: Number(visits.rows[0]?.count ?? 0),
    checkpointCount: Number(checkpoints.rows[0]?.count ?? 0),
    eventCount: Number(events.rows[0]?.count ?? 0),
    advanceLedgerCount: Number(ledger.rows[0]?.count ?? 0),
  };
}

describeDb("ULTEF Sprint 01 — session idempotency", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) return;
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    await seedStoryFixture(pool, ids);
    await pool.query(
      `INSERT INTO story.story_scenes (
         id, story_version_id, scene_key, sequence_number, scene_type, title,
         narrative_text, is_entry_scene, is_terminal_scene, metadata
       ) VALUES ($1, $2, 'idempotent-target', 1, 'narrative', 'Idempotent Target',
         'Arin ayni secimin iki kez gonderilmesine ragmen bu sahneye yalnizca bir kez ilerlemeli.', FALSE, FALSE, '{}'::jsonb)`,
      [nextSceneId, ids.storyVersionId],
    );
  });

  afterAll(async () => {
    if (!pool) return;
    await cleanupStoryFixture(pool, ids);
    await pool.end();
  });

  it("L3-SESSION-004 reuses duplicate idempotency key without duplicating persisted state", async () => {
    if (!pool) throw new Error("DATABASE_URL_REQUIRED");

    const scenario = createScenario({
      id: "L3-SESSION-004",
      title: "Duplicate session advance idempotency key produces one mutation",
      level: "L3",
      projectGate: "PX-LUMI-01",
      seed: "runtime-uuid",
    });
    scenario.setup("Child", { id: ids.childProfileId, name: "Deniz" });
    scenario.setup("Character", { id: ids.characterId, name: "Arin" });
    scenario.setup("Session", { id: ids.storySessionId, version: 1 });
    scenario.setup("Target scene", {
      id: nextSceneId,
      title: "Idempotent Target",
    });

    const before = await readState(pool);
    const idempotencyKey = `ultef-idempotent-advance:${ids.storySessionId}`;

    const first = await advanceSession({
      sessionId: ids.storySessionId,
      expectedVersion: 1,
      nextSceneId,
      idempotencyKey,
    });
    const afterFirst = await readState(pool);

    const second = await advanceSession({
      sessionId: ids.storySessionId,
      expectedVersion: 1,
      nextSceneId,
      idempotencyKey,
    });
    const afterSecond = await readState(pool);

    scenario.event(
      "session.advance.first",
      `Arin hedef sahneye ilk kez ilerledi; session version ${before.version} -> ${afterFirst.version}.`,
    );
    scenario.event(
      "session.advance.retry",
      "Ayni idempotency key ve ayni eski expectedVersion ile advance tekrar gonderildi; production servis mevcut persisted state'i geri dondurdu.",
    );
    scenario.event(
      "session.reload",
      "Ikinci cagridan sonra session, visit, checkpoint, event ve idempotency ledger PostgreSQL'den yeniden okundu.",
    );

    const firstSession = first.session as { version?: number; currentSceneId?: string | null };
    const secondSession = second.session as { version?: number; currentSceneId?: string | null };
    const assertions = {
      advancedOnce: afterFirst.version === 2 && afterFirst.currentSceneId === nextSceneId,
      secondReturnedSameState:
        secondSession.version === firstSession.version &&
        secondSession.currentSceneId === firstSession.currentSceneId,
      versionNotDuplicated: afterSecond.version === afterFirst.version,
      visitNotDuplicated: afterSecond.visitCount === afterFirst.visitCount,
      checkpointNotDuplicated:
        afterSecond.checkpointCount === afterFirst.checkpointCount,
      eventNotDuplicated: afterSecond.eventCount === afterFirst.eventCount,
      oneAdvanceLedger: afterSecond.advanceLedgerCount === 1,
    };

    scenario.assert(
      "First advance persisted exactly one session transition",
      assertions.advancedOnce,
      { version: 2, currentSceneId: nextSceneId },
      { version: afterFirst.version, currentSceneId: afterFirst.currentSceneId },
    );
    scenario.assert(
      "Retry returned the same persisted playback state",
      assertions.secondReturnedSameState,
      { version: firstSession.version, currentSceneId: firstSession.currentSceneId },
      { version: secondSession.version, currentSceneId: secondSession.currentSceneId },
    );
    scenario.assert(
      "Retry did not increment session version",
      assertions.versionNotDuplicated,
      afterFirst.version,
      afterSecond.version,
    );
    scenario.assert(
      "Retry did not create another scene visit",
      assertions.visitNotDuplicated,
      afterFirst.visitCount,
      afterSecond.visitCount,
    );
    scenario.assert(
      "Retry did not create another checkpoint",
      assertions.checkpointNotDuplicated,
      afterFirst.checkpointCount,
      afterSecond.checkpointCount,
    );
    scenario.assert(
      "Retry did not create another story event",
      assertions.eventNotDuplicated,
      afterFirst.eventCount,
      afterSecond.eventCount,
    );
    scenario.assert(
      "Exactly one session_advance idempotency ledger row exists",
      assertions.oneAdvanceLedger,
      1,
      afterSecond.advanceLedgerCount,
    );

    scenario.delta(
      "story.session.version",
      before.version,
      afterSecond.version,
      "one successful transition across two identical requests",
    );
    scenario.delta(
      "story.session.visitCount",
      afterFirst.visitCount,
      afterSecond.visitCount,
      "duplicate request must not create another visit",
    );
    scenario.delta(
      "story.session.eventCount",
      afterFirst.eventCount,
      afterSecond.eventCount,
      "duplicate request must not create another event",
    );

    const passed = Object.values(assertions).every(Boolean);
    const report = scenario.finish({
      result: passed ? "PASS" : "FAIL",
      reason: passed
        ? "The duplicate session advance reused the idempotency ledger and produced no second persistence mutation."
        : "Session idempotency or duplicate-state assertions failed.",
    });
    await writeScenarioArtifacts(report, { environment: "integration" });
    expect(report.result).toBe("PASS");
  });
});
