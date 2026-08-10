import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

import { createLogger } from "@lumi/logger";
import { enqueueNpcActionMoveIntent } from "@lumi/story/application";
import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";
import { OutboxJobRunner } from "../src/outbox-runner";

const enabled = process.env.ULTEF_SCENARIO === "PX-LUMI-S49-NPC-ACTION-EFFECT-001";
const databaseUrl = process.env.DATABASE_URL;
const describeDb = enabled && databaseUrl ? describe : describe.skip;

let pool: pg.Pool | null = null;

function assertSafeDisposableDatabase(url: string): void {
  const name = new URL(url).pathname.replace(/^\//, "").split("?")[0] ?? "";
  if (!name.includes("test") && !name.includes("review")) {
    throw new Error(`S49 ULTEF requires disposable test/review DB; got '${name}'.`);
  }
}

async function scalar(sql: string, params: unknown[] = []): Promise<string> {
  if (!pool) throw new Error("DB_NOT_CONNECTED");
  const result = await pool.query<{ value: string }>(sql, params);
  return result.rows[0]?.value ?? "0";
}

describeDb("ULTEF S49 — NPC action outbox world effect", () => {
  beforeAll(async () => {
    if (!databaseUrl) return;
    assertSafeDisposableDatabase(databaseUrl);
    pool = new pg.Pool({ connectionString: databaseUrl, max: 4 });
  });

  afterAll(async () => {
    await pool?.end();
    pool = null;
  });

  it("PX-LUMI-S49-NPC-ACTION-EFFECT-001 applies explicit movement once and replays safely", async () => {
    if (!pool) throw new Error("DATABASE_URL_REQUIRED");

    const householdId = crypto.randomUUID();
    const foreignHouseholdId = crypto.randomUUID();
    const childProfileId = crypto.randomUUID();
    const characterId = crypto.randomUUID();
    const npcId = crypto.randomUUID();
    const worldId = crypto.randomUUID();
    const regionId = crypto.randomUUID();
    const fromLocationId = crypto.randomUUID();
    const targetLocationId = crypto.randomUUID();
    const decisionEvidenceId = crypto.randomUUID();
    const decisionKey = `s49-${crypto.randomUUID()}`;
    const selectedCandidateId = "move-to-grove";

    const scenario = createScenario({
      id: "PX-LUMI-S49-NPC-ACTION-EFFECT-001",
      title: "NPC decision action reaches world exactly once",
      level: "L9",
      projectGate: "PX-LUMI-S49",
      seed: "runtime-uuid",
    });

    try {
      await pool.query(
        `INSERT INTO profile.worlds
          (id, household_id, child_profile_id, character_id, universe_seed, origin_seed,
           accepted_candidate_seed, generator_version, vector_version, lifecycle_status, version)
         VALUES ($1,$2,$3,$4,'u','o','a','s49','v1','active',1)`,
        [worldId, householdId, childProfileId, characterId],
      );
      await pool.query(
        `INSERT INTO profile.world_regions
          (id, world_id, region_key, display_name, region_type, accessibility_status,
           discovery_status, sort_order, version)
         VALUES ($1,$2,'s49-region','S49 Region','forest','open','explored',0,1)`,
        [regionId, worldId],
      );
      await pool.query(
        `INSERT INTO profile.world_locations
          (id, world_id, region_id, location_key, display_name, accessibility_status,
           location_type, occupancy_level, safety_level, is_home, version)
         VALUES
          ($1,$3,$4,'s49-from','From','open','custom','empty','safe',false,1),
          ($2,$3,$4,'s49-target','Target','open','custom','empty','safe',false,1)`,
        [fromLocationId, targetLocationId, worldId, regionId],
      );
      await pool.query(
        `INSERT INTO profile.world_location_connections
          (id, world_id, from_location_id, to_location_id, connection_type,
           traversal_cost, is_bidirectional, version)
         VALUES ($1,$2,$3,$4,'path',1,true,1)`,
        [crypto.randomUUID(), worldId, fromLocationId, targetLocationId],
      );
      await pool.query(
        `INSERT INTO profile.world_character_locations
          (character_id, world_id, location_id, version)
         VALUES ($1,$2,$3,1)`,
        [characterId, worldId, fromLocationId],
      );

      const firstEnqueue = await enqueueNpcActionMoveIntent({
        householdId,
        worldId,
        childProfileId,
        npcId,
        characterId,
        decisionEvidenceId,
        decisionKey,
        selectedCandidateId,
        targetLocationId,
      });
      const duplicateEnqueue = await enqueueNpcActionMoveIntent({
        householdId,
        worldId,
        childProfileId,
        npcId,
        characterId,
        decisionEvidenceId,
        decisionKey,
        selectedCandidateId,
        targetLocationId,
      });
      const enqueueIdempotent =
        firstEnqueue.outcome === "enqueued" &&
        duplicateEnqueue.outcome === "duplicate" &&
        firstEnqueue.outboxId === duplicateEnqueue.outboxId;
      scenario.assert(
        "Repeated decision effect enqueue reuses one durable outbox row",
        enqueueIdempotent,
        { first: "enqueued", replay: "duplicate" },
        { first: firstEnqueue, replay: duplicateEnqueue },
      );

      const foreign = await enqueueNpcActionMoveIntent({
        householdId: foreignHouseholdId,
        worldId,
        childProfileId,
        npcId,
        characterId,
        decisionEvidenceId: crypto.randomUUID(),
        decisionKey: `${decisionKey}-foreign`,
        selectedCandidateId,
        targetLocationId,
      });

      const firstRun = await new OutboxJobRunner(
        createLogger({ level: "error" }),
        25,
        100,
      ).run();
      const locationAfter = await scalar(
        `SELECT location_id::text AS value
           FROM profile.world_character_locations
          WHERE character_id = $1`,
        [characterId],
      );
      const movementCount = Number(
        await scalar(
          `SELECT count(*)::text AS value
             FROM profile.world_character_movement_events
            WHERE character_id = $1`,
          [characterId],
        ),
      );
      const appliedOnce =
        firstRun.applied >= 1 &&
        locationAfter === targetLocationId &&
        movementCount === 1;
      scenario.assert(
        "Worker dispatch applies selected explicit movement to canonical world state",
        appliedOnce,
        { locationId: targetLocationId, movementEvents: 1 },
        { locationId: locationAfter, movementEvents: movementCount, summary: firstRun },
      );

      const foreignState = await pool.query<{ status: string; attempt_count: string }>(
        `SELECT status, attempt_count
           FROM story.story_outbox
          WHERE id = $1`,
        [foreign.outboxId],
      );
      const crossScopeRejected =
        foreignState.rows[0]?.status === "pending" &&
        foreignState.rows[0]?.attempt_count === "1";
      scenario.assert(
        "Cross-household movement effect fails closed and remains retryable",
        crossScopeRejected,
        { status: "pending", attempts: "1" },
        foreignState.rows[0] ?? null,
      );

      await pool.query(
        `UPDATE story.story_outbox
            SET status = 'pending', applied_at = NULL
          WHERE id = $1`,
        [firstEnqueue.outboxId],
      );
      const replay = await new OutboxJobRunner(
        createLogger({ level: "error" }),
        25,
        100,
      ).run();
      const replayMovementCount = Number(
        await scalar(
          `SELECT count(*)::text AS value
             FROM profile.world_character_movement_events
            WHERE character_id = $1`,
          [characterId],
        ),
      );
      const replaySafe = replay.applied >= 1 && replayMovementCount === 1;
      scenario.assert(
        "At-least-once outbox replay creates no second movement event",
        replaySafe,
        1,
        replayMovementCount,
      );

      const passed =
        enqueueIdempotent && appliedOnce && crossScopeRejected && replaySafe;
      const report = scenario.finish({
        result: passed ? "PASS" : "FAIL",
        reason: passed
          ? "Explicit NPC movement effect was durably enqueued once, applied through the production outbox/world boundary, rejected across household scope, and replayed without a duplicate movement."
          : "One or more S49 NPC action effect invariants failed.",
      });
      await writeScenarioArtifacts(report, {
        environment: "disposable-postgres-s49-npc-action-effect",
      });
      expect(report.result).toBe("PASS");
    } finally {
      await pool.query(`DELETE FROM story.story_outbox WHERE world_id = $1`, [worldId]);
      await pool.query(
        `DELETE FROM profile.world_event_store WHERE world_id = $1`,
        [worldId],
      );
      await pool.query(
        `DELETE FROM profile.world_character_movement_events WHERE world_id = $1`,
        [worldId],
      );
      await pool.query(
        `DELETE FROM profile.world_character_locations WHERE world_id = $1`,
        [worldId],
      );
      await pool.query(
        `DELETE FROM profile.world_location_connections WHERE world_id = $1`,
        [worldId],
      );
      await pool.query(`DELETE FROM profile.world_locations WHERE world_id = $1`, [worldId]);
      await pool.query(`DELETE FROM profile.world_regions WHERE world_id = $1`, [worldId]);
      await pool.query(`DELETE FROM profile.worlds WHERE id = $1`, [worldId]);
    }
  });
});
