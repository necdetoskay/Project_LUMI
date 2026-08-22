import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DrizzleCanonicalMemoryRepository } from "@lumi/npc-intelligence/db";
import { createDatabase as createNpcDatabase } from "@lumi/npc-intelligence/db/client";
import type { CanonicalMemory } from "@lumi/npc-intelligence/domain";

import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";
import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";
import { seedCanonicalNpcFixture } from "./helpers/canonical-npc-fixture";

const SCENARIO_ID = "PX-LUMI-S45-MEMORY-LIFECYCLE-001";
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
      `S45 lifecycle test requires a disposable DB; got '${name}'.`,
    );
  }
}

function makeMemory(input: {
  id: string;
  householdId: string;
  worldId: string;
  profileId: string;
  ownerId: string;
  summary: string;
  createdAt: Date;
  salience: number;
}): CanonicalMemory {
  return {
    id: input.id,
    householdId: input.householdId,
    worldId: input.worldId,
    childProfileId: input.profileId,
    ownerType: "npc",
    ownerId: input.ownerId,
    kind: "experience",
    summary: input.summary,
    salience: input.salience,
    confidence: 0.95,
    sourceType: "story_outcome",
    sourceId: `source:${input.id}`,
    effectKey: `s45:${input.id}`,
    provenance: [`s45:${input.id}`],
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
  it("proves scoped reinforcement, archive safety and long-horizon ranking", async () => {
    const householdId = crypto.randomUUID();
    const worldId = crypto.randomUUID();
    const profileId = crypto.randomUUID();
    const otherProfileId = crypto.randomUUID();
    const characterId = crypto.randomUUID();
    const ownerId = crypto.randomUUID();
    const repo = new DrizzleCanonicalMemoryRepository(
      createNpcDatabase(databaseUrl!),
    );
    const scenario = createScenario({
      id: SCENARIO_ID,
      title: "Memory lifecycle and long-horizon continuity",
      level: "L9",
      projectGate: "S45-MEMORY-LIFECYCLE-CONTRACT-001",
      seed: "s45-memory-lifecycle-001",
    });

    const oldId = crypto.randomUUID();
    const recentId = crypto.randomUUID();
    const archivedId = crypto.randomUUID();
    const now = new Date("2026-08-09T20:00:00.000Z");

    try {
      await seedCanonicalNpcFixture(pool, {
        householdId,
        childProfileId: profileId,
        characterId,
        worldId,
        fixtureKey: `s45-${householdId}`,
        npcs: [{ id: ownerId, name: "S45 Memory NPC" }],
      });

      await repo.save(
        makeMemory({
          id: oldId,
          householdId,
          worldId,
          profileId,
          ownerId,
          summary: "Old memory reinforced today",
          createdAt: new Date("2026-07-12T20:00:00.000Z"),
          salience: 0.9,
        }),
      );
      await repo.save(
        makeMemory({
          id: recentId,
          householdId,
          worldId,
          profileId,
          ownerId,
          summary: "Recent unreinforced memory",
          createdAt: new Date("2026-08-08T20:00:00.000Z"),
          salience: 0.7,
        }),
      );
      await repo.save(
        makeMemory({
          id: archivedId,
          householdId,
          worldId,
          profileId,
          ownerId,
          summary: "Archived memory",
          createdAt: new Date("2026-08-09T18:00:00.000Z"),
          salience: 1,
        }),
      );

      const wrongScopeReinforce = await repo.reinforce({
        memoryId: oldId,
        householdId,
        worldId,
        childProfileId: otherProfileId,
        ownerType: "npc",
        ownerId,
        at: now,
      });
      const reinforced = await repo.reinforce({
        memoryId: oldId,
        householdId,
        worldId,
        childProfileId: profileId,
        ownerType: "npc",
        ownerId,
        at: now,
      });
      const archived = await repo.archive({
        memoryId: archivedId,
        householdId,
        worldId,
        childProfileId: profileId,
        ownerType: "npc",
        ownerId,
        at: now,
      });

      const relevant = await repo.listRelevant({
        householdId,
        worldId,
        childProfileId: profileId,
        ownerType: "npc",
        ownerId,
        now,
        limit: 10,
      });

      scenario.assert(
        "Cross-profile reinforcement is rejected",
        wrongScopeReinforce === false,
        false,
        wrongScopeReinforce,
      );
      scenario.assert(
        "Correctly scoped reinforcement succeeds",
        reinforced === true,
        true,
        reinforced,
      );
      scenario.assert(
        "Correctly scoped archive succeeds",
        archived === true,
        true,
        archived,
      );
      scenario.assert(
        "Archived memory cannot re-enter retrieval",
        relevant.every((memory) => memory.id !== archivedId),
        "archived memory absent",
        relevant.map((memory) => memory.id),
      );
      scenario.assert(
        "Reinforced old memory outranks recent unreinforced memory",
        relevant[0]?.id === oldId,
        oldId,
        relevant[0]?.id ?? null,
      );

      const passed =
        !wrongScopeReinforce &&
        reinforced &&
        archived &&
        relevant.every((memory) => memory.id !== archivedId) &&
        relevant[0]?.id === oldId;

      scenario.event(
        "memory.lifecycle.contract",
        "Scoped reinforcement reset decay, archive removed memory from active retrieval, and cross-profile mutation was rejected.",
        {
          ranking: relevant.map((memory) => ({
            id: memory.id,
            summary: memory.summary,
            reinforcedAt: memory.lastReinforcedAt?.toISOString() ?? null,
          })),
        },
      );

      const report = scenario.finish({
        result: passed ? "PASS" : "FAIL",
        reason: passed
          ? "Lifecycle mutations remain scoped and reinforcement deterministically affects long-horizon retrieval."
          : "One or more S45 lifecycle invariants failed.",
      });
      await writeScenarioArtifacts(report, {
        environment: "disposable-postgres-s45-memory-lifecycle",
      });
      expect(report.result).toBe("PASS");
    } finally {
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
