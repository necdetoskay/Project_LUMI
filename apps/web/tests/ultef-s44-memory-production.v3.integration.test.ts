import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

import { commitCanonicalMemories } from "@lumi/story/application";
import { createDatabase as createStoryDatabase } from "@lumi/story/db/client";
import { createDatabase as createNpcDatabase } from "@lumi/npc-intelligence/db/client";
import { DrizzleCanonicalMemoryRepository } from "@lumi/npc-intelligence/db";
import type { WorldChange } from "@lumi/story/domain";

import { createScenario } from "../../../tooling/ultef/src/evidence.mjs";
import { writeScenarioArtifacts } from "../../../tooling/ultef/src/artifacts.mjs";

const SCENARIO_ID = "PX-LUMI-S44-MEMORY-PRODUCTION-001";
const COMMITTED_SUMMARY = "Bora eski köprüde Arin'e verdiği sözü hatırlıyor.";
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
      `S44 memory production requires a disposable DB; got '${name}'.`,
    );
  }
}

function memoryChange(input: {
  key: string;
  ownerId: string;
  summary: string;
  salience?: number;
}): WorldChange {
  return {
    changeKey: input.key,
    entityId: input.ownerId,
    kind: "set",
    field: `memory.${input.key}`,
    value: {
      summary: input.summary,
      kind: "experience",
      salience: input.salience ?? 0.8,
      confidence: 0.95,
      lifecycle: "durable",
      provenance: [`scene:${input.key}`],
    },
    priority: 1,
    ruleId: "default-npc-memory",
    sequence: 0,
    evidenceRef: `evidence:${input.key}`,
    status: "committed",
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
  it("proves commit-only, replay-safe, rollback-safe and tenant/profile-scoped canonical memory", async () => {
    const householdA = crypto.randomUUID();
    const householdB = crypto.randomUUID();
    const worldA = crypto.randomUUID();
    const worldB = crypto.randomUUID();
    const profileA = crypto.randomUUID();
    const profileB = crypto.randomUUID();
    const ownerA = crypto.randomUUID();
    const sessionA = crypto.randomUUID();
    const sessionB = crypto.randomUUID();
    const storyDb = createStoryDatabase(databaseUrl!);
    const memoryRepo = new DrizzleCanonicalMemoryRepository(
      createNpcDatabase(databaseUrl!),
    );
    const scenario = createScenario({
      id: SCENARIO_ID,
      title: "Canonical memory production contract",
      level: "L9",
      projectGate: "S44-MEMORY-PRODUCTION-CONTRACT-001",
      seed: "s44-memory-production-001",
    });

    try {
      const committed = memoryChange({
        key: "bridge-promise",
        ownerId: ownerA,
        summary: COMMITTED_SUMMARY,
        salience: 0.95,
      });

      await storyDb.transaction(async (tx) => {
        const input = {
          tx,
          householdId: householdA,
          worldId: worldA,
          childProfileId: profileA,
          storySessionId: sessionA,
          outcomeId: "outcome-bridge-promise",
          commitId: "commit-bridge-promise",
          changes: [committed],
          createdAt: new Date("2026-08-09T18:00:00.000Z"),
        };
        await commitCanonicalMemories(input);
        await commitCanonicalMemories(input);
      });

      const duplicateCount = await pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
           FROM npc_intelligence.memories
          WHERE household_id = $1 AND world_id = $2
            AND effect_key = 'story-memory:outcome-bridge-promise:bridge-promise'`,
        [householdA, worldA],
      );
      scenario.assert(
        "Replay produces exactly one canonical memory",
        duplicateCount.rows[0]?.count === "1",
        "1",
        duplicateCount.rows[0]?.count ?? null,
      );

      const rollbackOutcome = "outcome-rollback-memory";
      try {
        await storyDb.transaction(async (tx) => {
          await commitCanonicalMemories({
            tx,
            householdId: householdA,
            worldId: worldA,
            childProfileId: profileA,
            storySessionId: sessionA,
            outcomeId: rollbackOutcome,
            commitId: "commit-rollback-memory",
            changes: [
              memoryChange({
                key: "rollback-memory",
                ownerId: ownerA,
                summary: "Bu hafıza transaction rollback sonrası kalmamalı.",
              }),
            ],
            createdAt: new Date("2026-08-09T18:01:00.000Z"),
          });
          throw new Error("S44_FORCED_ROLLBACK");
        });
      } catch (error) {
        if (
          !(error instanceof Error) ||
          error.message !== "S44_FORCED_ROLLBACK"
        ) {
          throw error;
        }
      }

      const rollbackCount = await pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
           FROM npc_intelligence.memories
          WHERE household_id = $1 AND world_id = $2
            AND outcome_id = $3`,
        [householdA, worldA, rollbackOutcome],
      );
      scenario.assert(
        "Rolled-back transaction leaves no canonical memory residue",
        rollbackCount.rows[0]?.count === "0",
        "0",
        rollbackCount.rows[0]?.count ?? null,
      );

      await storyDb.transaction(async (tx) => {
        await commitCanonicalMemories({
          tx,
          householdId: householdA,
          worldId: worldA,
          childProfileId: profileB,
          storySessionId: sessionA,
          outcomeId: "outcome-other-profile",
          commitId: "commit-other-profile",
          changes: [
            memoryChange({
              key: "other-profile",
              ownerId: ownerA,
              summary: "Başka çocuk profiline ait hafıza.",
            }),
          ],
          createdAt: new Date("2026-08-09T18:02:00.000Z"),
        });
        await commitCanonicalMemories({
          tx,
          householdId: householdB,
          worldId: worldB,
          childProfileId: profileA,
          storySessionId: sessionB,
          outcomeId: "outcome-other-tenant",
          commitId: "commit-other-tenant",
          changes: [
            memoryChange({
              key: "other-tenant",
              ownerId: ownerA,
              summary: "Başka household hafızası.",
            }),
          ],
          createdAt: new Date("2026-08-09T18:03:00.000Z"),
        });
      });

      for (let index = 0; index < 20; index += 1) {
        await storyDb.transaction(async (tx) => {
          await commitCanonicalMemories({
            tx,
            householdId: householdA,
            worldId: worldA,
            childProfileId: profileA,
            storySessionId: sessionA,
            outcomeId: `outcome-bound-${index}`,
            commitId: `commit-bound-${index}`,
            changes: [
              memoryChange({
                key: `bound-${index}`,
                ownerId: ownerA,
                summary: `Bounded memory ${index}`,
                salience: index / 20,
              }),
            ],
            createdAt: new Date(1_786_300_000_000 + index * 1_000),
          });
        });
      }

      const relevant = await memoryRepo.listRelevant({
        householdId: householdA,
        worldId: worldA,
        childProfileId: profileA,
        ownerType: "npc",
        ownerId: ownerA,
        now: new Date("2026-08-10T00:00:00.000Z"),
        limit: 5,
      });

      scenario.assert(
        "Retrieval is hard bounded",
        relevant.length === 5,
        5,
        relevant.length,
      );
      scenario.assert(
        "Retrieval cannot leak another profile",
        relevant.every((memory) => memory.childProfileId === profileA),
        profileA,
        relevant.map((memory) => memory.childProfileId),
      );
      scenario.assert(
        "Retrieval cannot leak another tenant/world",
        relevant.every(
          (memory) =>
            memory.householdId === householdA && memory.worldId === worldA,
        ),
        `${householdA}/${worldA}`,
        relevant.map((memory) => `${memory.householdId}/${memory.worldId}`),
      );
      scenario.assert(
        "Highest-salience committed memory ranks first deterministically",
        relevant[0]?.summary === COMMITTED_SUMMARY,
        COMMITTED_SUMMARY,
        relevant[0]?.summary ?? null,
      );

      scenario.event(
        "memory.production.contract",
        "Committed memory persisted once, rollback left no residue, and retrieval stayed bounded plus tenant/profile scoped.",
        {
          duplicateCount: duplicateCount.rows[0]?.count,
          rollbackCount: rollbackCount.rows[0]?.count,
          retrieved: relevant.map((memory) => ({
            summary: memory.summary,
            salience: memory.salience,
          })),
        },
      );

      const passed =
        duplicateCount.rows[0]?.count === "1" &&
        rollbackCount.rows[0]?.count === "0" &&
        relevant.length === 5 &&
        relevant.every(
          (memory) =>
            memory.householdId === householdA &&
            memory.worldId === worldA &&
            memory.childProfileId === profileA,
        ) &&
        relevant[0]?.summary === COMMITTED_SUMMARY;

      const report = scenario.finish({
        result: passed ? "PASS" : "FAIL",
        reason: passed
          ? "Canonical memory is replay-safe, transaction rollback-safe, bounded and isolated by household/world/profile/owner scope."
          : "One or more S44 canonical memory production invariants failed.",
      });
      await writeScenarioArtifacts(report, {
        environment: "disposable-postgres-s44-memory-production",
      });
      expect(report.result).toBe("PASS");
    } finally {
      await pool.query(
        "DELETE FROM npc_intelligence.memories WHERE household_id = ANY($1::uuid[])",
        [[householdA, householdB]],
      );
    }
  });
});
