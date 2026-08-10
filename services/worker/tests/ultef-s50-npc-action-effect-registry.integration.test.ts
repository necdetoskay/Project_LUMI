import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

import { createLogger } from "@lumi/logger";
import { DrizzleNpcSnapshotRepository } from "@lumi/npc-intelligence/db";
import { enqueueNpcActionRelationshipIntent } from "@lumi/story/application";
import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";
import { OutboxJobRunner } from "../src/outbox-runner";

const enabled =
  process.env.ULTEF_SCENARIO === "PX-LUMI-S50-NPC-ACTION-EFFECT-REGISTRY-001";
const databaseUrl = process.env.DATABASE_URL;
const describeDb = enabled && databaseUrl ? describe : describe.skip;

let pool: pg.Pool | null = null;

function assertSafeDisposableDatabase(url: string): void {
  const name = new URL(url).pathname.replace(/^\//, "").split("?")[0] ?? "";
  if (!name.includes("test") && !name.includes("review")) {
    throw new Error(
      `S50 ULTEF requires disposable test/review DB; got '${name}'.`,
    );
  }
}

async function scalar(sql: string, params: unknown[] = []): Promise<string> {
  if (!pool) throw new Error("DB_NOT_CONNECTED");
  const result = await pool.query<{ value: string }>(sql, params);
  return result.rows[0]?.value ?? "";
}

describeDb("ULTEF S50 — typed NPC action effect registry", () => {
  beforeAll(async () => {
    if (!databaseUrl) return;
    assertSafeDisposableDatabase(databaseUrl);
    pool = new pg.Pool({ connectionString: databaseUrl, max: 4 });
  });

  afterAll(async () => {
    await pool?.end();
    pool = null;
  });

  it("PX-LUMI-S50-NPC-ACTION-EFFECT-REGISTRY-001 applies relationship effect once and rejects foreign scope", async () => {
    if (!pool) throw new Error("DATABASE_URL_REQUIRED");

    const householdId = crypto.randomUUID();
    const foreignHouseholdId = crypto.randomUUID();
    const worldId = crypto.randomUUID();
    const childProfileId = crypto.randomUUID();
    const characterId = crypto.randomUUID();
    const npcId = crypto.randomUUID();
    const evidenceId = crypto.randomUUID();
    const selectedCandidateId = "trust-child";
    const relationshipToCharacter = 0.75;

    const snapshots = new DrizzleNpcSnapshotRepository();
    await snapshots.upsert({
      householdId,
      worldId,
      childProfileId,
      characterId,
      npcId,
      locationId: null,
      needTypes: [],
      relationshipToCharacter: 0.1,
      lastInteractionAt: new Date(),
      updatedAt: new Date(),
    });

    const scenario = createScenario({
      id: "PX-LUMI-S50-NPC-ACTION-EFFECT-REGISTRY-001",
      title: "Typed NPC effect registry applies relationship state safely",
      level: "L9",
      projectGate: "PX-LUMI-S50",
      seed: "runtime-uuid",
    });

    try {
      const first = await enqueueNpcActionRelationshipIntent({
        householdId,
        worldId,
        childProfileId,
        npcId,
        characterId,
        decisionEvidenceId: evidenceId,
        decisionKey: `s50-${crypto.randomUUID()}`,
        selectedCandidateId,
        relationshipToCharacter,
      });
      const duplicate = await enqueueNpcActionRelationshipIntent({
        householdId,
        worldId,
        childProfileId,
        npcId,
        characterId,
        decisionEvidenceId: evidenceId,
        decisionKey: "ignored-on-duplicate",
        selectedCandidateId,
        relationshipToCharacter,
      });
      const enqueueSafe =
        first.outcome === "enqueued" &&
        duplicate.outcome === "duplicate" &&
        first.outboxId === duplicate.outboxId;
      scenario.assert(
        "Typed relationship effect enqueue is idempotent",
        enqueueSafe,
        true,
        enqueueSafe,
      );

      const firstRun = await new OutboxJobRunner(
        createLogger({ level: "error" }),
        25,
        100,
      ).run();
      const relationshipAfter = Number(
        await scalar(
          `SELECT relationship_to_character::text AS value
             FROM npc_intelligence.npc_snapshots
            WHERE household_id=$1 AND world_id=$2 AND child_profile_id=$3 AND npc_id=$4`,
          [householdId, worldId, childProfileId, npcId],
        ),
      );
      const applied =
        firstRun.applied >= 1 && relationshipAfter === relationshipToCharacter;
      scenario.assert(
        "Registry dispatch applies bounded absolute relationship state",
        applied,
        relationshipToCharacter,
        relationshipAfter,
      );

      await pool.query(
        `UPDATE story.story_outbox SET status='pending', applied_at=NULL WHERE id=$1`,
        [first.outboxId],
      );
      const replay = await new OutboxJobRunner(
        createLogger({ level: "error" }),
        25,
        100,
      ).run();
      const relationshipAfterReplay = Number(
        await scalar(
          `SELECT relationship_to_character::text AS value
             FROM npc_intelligence.npc_snapshots
            WHERE household_id=$1 AND world_id=$2 AND child_profile_id=$3 AND npc_id=$4`,
          [householdId, worldId, childProfileId, npcId],
        ),
      );
      const replaySafe =
        replay.applied >= 1 &&
        relationshipAfterReplay === relationshipToCharacter;
      scenario.assert(
        "At-least-once replay leaves absolute relationship unchanged",
        replaySafe,
        relationshipToCharacter,
        relationshipAfterReplay,
      );

      const foreign = await enqueueNpcActionRelationshipIntent({
        householdId: foreignHouseholdId,
        worldId,
        childProfileId,
        npcId,
        characterId,
        decisionEvidenceId: crypto.randomUUID(),
        decisionKey: `foreign-${crypto.randomUUID()}`,
        selectedCandidateId,
        relationshipToCharacter: -0.5,
      });
      await new OutboxJobRunner(
        createLogger({ level: "error" }),
        25,
        100,
      ).run();
      const foreignState = await pool.query<{
        status: string;
        attempt_count: string;
      }>(`SELECT status, attempt_count FROM story.story_outbox WHERE id=$1`, [
        foreign.outboxId,
      ]);
      const crossScopeRejected =
        foreignState.rows[0]?.status === "pending" &&
        foreignState.rows[0]?.attempt_count === "1";
      scenario.assert(
        "Foreign-household relationship effect fails closed",
        crossScopeRejected,
        { status: "pending", attempts: "1" },
        foreignState.rows[0] ?? null,
      );

      const passed = enqueueSafe && applied && replaySafe && crossScopeRejected;
      const report = scenario.finish({
        result: passed ? "PASS" : "FAIL",
        reason: passed
          ? "Typed NPC registry applied an absolute relationship effect exactly once, replayed idempotently, and rejected foreign scope."
          : "One or more S50 typed NPC effect invariants failed.",
      });
      await writeScenarioArtifacts(report, {
        environment: "disposable-postgres-s50-npc-action-registry",
      });
      expect(report.result).toBe("PASS");
    } finally {
      await pool.query(`DELETE FROM story.story_outbox WHERE world_id=$1`, [
        worldId,
      ]);
      await pool.query(
        `DELETE FROM npc_intelligence.npc_snapshots WHERE world_id=$1`,
        [worldId],
      );
    }
  });
});
