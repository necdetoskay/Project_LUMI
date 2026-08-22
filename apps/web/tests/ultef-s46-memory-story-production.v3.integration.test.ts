import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DrizzleCanonicalMemoryRepository } from "@lumi/npc-intelligence/db";
import { createDatabase as createNpcDatabase } from "@lumi/npc-intelligence/db/client";
import type { CanonicalMemory } from "@lumi/npc-intelligence/domain";

import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";
import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";
import { seedCanonicalNpcFixture } from "./helpers/canonical-npc-fixture";

const SCENARIO_ID = "PX-LUMI-S46-MEMORY-STORY-PROD-001";
const enabled = process.env.ULTEF_SCENARIO === SCENARIO_ID;
const databaseUrl =
  process.env.STORY_TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const destructive = process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true";
const ultefDescribe =
  enabled && destructive && databaseUrl ? describe : describe.skip;

let pool: pg.Pool;

function assertSafeDisposableDatabase(url: string) {
  const name = new URL(url).pathname.replace(/^\//, "").split("?")[0] ?? "";
  if (!name.includes("test") && !name.includes("review")) {
    throw new Error(
      `S46 memory-story test requires a disposable DB; got '${name}'.`,
    );
  }
}

function makeMemory(input: {
  id: string;
  householdId: string;
  worldId: string;
  profileId: string;
  ownerId: string;
  createdAt: Date;
}): CanonicalMemory {
  return {
    id: input.id,
    householdId: input.householdId,
    worldId: input.worldId,
    childProfileId: input.profileId,
    ownerType: "character",
    ownerId: input.ownerId,
    kind: "experience",
    summary:
      "The child and character solved the lantern bridge mystery together.",
    salience: 0.8,
    confidence: 0.98,
    sourceType: "story_outcome",
    sourceId: `source:${input.id}`,
    effectKey: `s46:${input.id}`,
    provenance: [`s46:${input.id}`],
    lifecycle: "decaying",
    supersedesMemoryId: null,
    createdAt: input.createdAt,
    lastReinforcedAt: null,
    expiresAt: null,
    archivedAt: null,
  };
}

beforeAll(async () => {
  if (!enabled || !destructive || !databaseUrl) return;
  assertSafeDisposableDatabase(databaseUrl);
  pool = new pg.Pool({ connectionString: databaseUrl });
});

afterAll(async () => {
  if (pool) await pool.end();
});

ultefDescribe(`ULTEF ${SCENARIO_ID}`, () => {
  it("proves scene-scoped reinforcement is replay-safe and tenant/profile scoped", async () => {
    const householdId = crypto.randomUUID();
    const worldId = crypto.randomUUID();
    const profileId = crypto.randomUUID();
    const otherProfileId = crypto.randomUUID();
    const ownerId = crypto.randomUUID();
    const memoryId = crypto.randomUUID();
    const sceneId = crypto.randomUUID();
    const otherSceneId = crypto.randomUUID();
    const firstUseAt = new Date("2026-08-09T20:00:00.000Z");
    const replayAt = new Date("2026-08-09T21:00:00.000Z");
    const repo = new DrizzleCanonicalMemoryRepository(
      createNpcDatabase(databaseUrl!),
    );
    const scenario = createScenario({
      id: SCENARIO_ID,
      title: "Memory usage evidence to story reinforcement",
      level: "L9",
      projectGate: "S46-MEMORY-STORY-PRODUCTION-001",
      seed: "s46-memory-story-production-001",
    });

    try {
      await seedCanonicalNpcFixture(pool, {
        householdId,
        childProfileId: profileId,
        characterId: ownerId,
        worldId,
        fixtureKey: `s46-${householdId}`,
        npcs: [],
      });

      await repo.save(
        makeMemory({
          id: memoryId,
          householdId,
          worldId,
          profileId,
          ownerId,
          createdAt: new Date("2026-07-20T20:00:00.000Z"),
        }),
      );

      const applied = await repo.reinforceForScene({
        memoryId,
        sceneId,
        householdId,
        worldId,
        childProfileId: profileId,
        ownerType: "character",
        ownerId,
        at: firstUseAt,
      });
      const duplicate = await repo.reinforceForScene({
        memoryId,
        sceneId,
        householdId,
        worldId,
        childProfileId: profileId,
        ownerType: "character",
        ownerId,
        at: replayAt,
      });
      const rejected = await repo.reinforceForScene({
        memoryId,
        sceneId: otherSceneId,
        householdId,
        worldId,
        childProfileId: otherProfileId,
        ownerType: "character",
        ownerId,
        at: replayAt,
      });

      const memoryRows = await pool.query<{
        last_reinforced_at: Date | string | null;
      }>(
        "SELECT last_reinforced_at FROM npc_intelligence.memories WHERE id = $1",
        [memoryId],
      );
      const usageRows = await pool.query<{
        scene_id: string;
        memory_id: string;
      }>(
        "SELECT scene_id, memory_id FROM npc_intelligence.memory_usages WHERE household_id = $1 ORDER BY used_at",
        [householdId],
      );
      const reinforcedAtRaw = memoryRows.rows[0]?.last_reinforced_at ?? null;
      const reinforcedAt = reinforcedAtRaw
        ? new Date(reinforcedAtRaw).toISOString()
        : null;

      scenario.assert(
        "First persisted scene usage reinforces memory",
        applied === "applied",
        "applied",
        applied,
      );
      scenario.assert(
        "Replay of same scene-memory pair is idempotent",
        duplicate === "duplicate",
        "duplicate",
        duplicate,
      );
      scenario.assert(
        "Cross-profile scene usage is rejected",
        rejected === "rejected",
        "rejected",
        rejected,
      );
      scenario.assert(
        "Replay does not move reinforcement timestamp",
        reinforcedAt === firstUseAt.toISOString(),
        firstUseAt.toISOString(),
        reinforcedAt,
      );
      scenario.assert(
        "Only one durable usage evidence row remains",
        usageRows.rows.length === 1 &&
          usageRows.rows[0]?.scene_id === sceneId &&
          usageRows.rows[0]?.memory_id === memoryId,
        { sceneId, memoryId, count: 1 },
        usageRows.rows,
      );

      const passed =
        applied === "applied" &&
        duplicate === "duplicate" &&
        rejected === "rejected" &&
        reinforcedAt === firstUseAt.toISOString() &&
        usageRows.rows.length === 1;

      scenario.event(
        "memory.story.usage",
        "Validated scene memory usage reinforced exactly once; replay was idempotent and cross-profile usage rolled back.",
        {
          sceneId,
          memoryId,
          reinforcedAt,
          usageCount: usageRows.rows.length,
        },
      );

      const report = scenario.finish({
        result: passed ? "PASS" : "FAIL",
        reason: passed
          ? "Scene-scoped memory usage evidence is replay-safe and tenant/profile scoped."
          : "One or more S46 memory-to-story invariants failed.",
      });
      await writeScenarioArtifacts(report, {
        environment: "disposable-postgres-s46-memory-story",
      });
      expect(report.result).toBe("PASS");
    } finally {
      await pool.query(
        "DELETE FROM npc_intelligence.memory_usages WHERE household_id = $1",
        [householdId],
      );
      await pool.query(
        "DELETE FROM npc_intelligence.memories WHERE household_id = $1",
        [householdId],
      );
      await pool.query("DELETE FROM profile.households WHERE id = $1", [
        householdId,
      ]);
    }
  });
});
