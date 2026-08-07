import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";

import * as schema from "../../src/db/schema/story";
import type { Database } from "../../src/db/client";
import {
  IndirectEffectPropagator,
  __setTestPropagationDb,
} from "../../src/application/indirect-effect-propagator.service";
import { RumorSpreadApplicator } from "../../src/application/rumor-propagation-applicator.service";
import { __setTestCommitDb } from "../../src/application/world-commit.service";

const ENABLE_DESTRUCTIVE =
  process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true";
const DATABASE_URL = process.env.STORY_TEST_DATABASE_URL;
const LUMI_DB_NAMES = ["lumi", "postgres", "template1", "template0"];

function getSafeDbName(url: string): string {
  const u = new URL(url);
  const dbName = u.pathname.replace(/^\//, "").split("?")[0]!;
  if (!dbName) {
    throw new Error(
      `[STORY-DESTRUCTIVE-TEST] Empty DB name parsed from: ${url}`,
    );
  }
  if (LUMI_DB_NAMES.includes(dbName)) {
    throw new Error(
      `[STORY-DESTRUCTIVE-TEST] DESTRUCTIVE TEST BLOCKED for production DB: "${dbName}".`,
    );
  }
  if (!dbName.includes("test") && !dbName.includes("review")) {
    throw new Error(`[STORY-DESTRUCTIVE-TEST] UNSAFE DB NAME: "${dbName}".`);
  }
  return dbName;
}

function isDestructiveEnabled(): boolean {
  if (!ENABLE_DESTRUCTIVE) return false;
  if (!DATABASE_URL) return false;
  try {
    getSafeDbName(DATABASE_URL);
  } catch {
    return false;
  }
  return true;
}

const householdA = "20000000-0000-4000-8000-000000000001";
const worldA = "30000000-0000-4000-8000-000000000001";

let queryClient: ReturnType<typeof postgres>;
let db: Database;
let pool: pg.Pool;

beforeAll(async () => {
  if (!isDestructiveEnabled()) return;
  queryClient = postgres(DATABASE_URL!, { max: 2 });
  db = drizzle(queryClient, { schema });
  pool = new pg.Pool({ connectionString: DATABASE_URL });
  __setTestCommitDb(db);
  __setTestPropagationDb(db);

  await pool.query("CREATE SCHEMA IF NOT EXISTS story;");
  for (const file of [
    "0003_world_commit_system.sql",
    "0004_story_outbox.sql",
  ]) {
    const migration = readFileSync(
      resolve(__dirname, "..", "..", "migrations", file),
      "utf-8",
    );
    await pool.query(migration);
  }
});

afterAll(async () => {
  if (!ENABLE_DESTRUCTIVE || !DATABASE_URL) return;
  await queryClient.end();
  await pool.end();
});

describe.skipIf(!isDestructiveEnabled())(
  "Rumor propagation outbox integration",
  () => {
    it("enqueues npc_rumor_spread intents and applies them idempotently", async () => {
      const commitId = "50000000-0000-4000-8000-000000000001";
      await db.insert(schema.storyOutbox).values([
        {
          householdId: householdA,
          worldId: worldA,
          commitId,
          idempotencyKey: "rumor:npc-alpha:npc-beta:f-1",
          intentType: "npc_rumor_spread",
          payload: {
            sourceNpcId: "npc-alpha",
            targetNpcId: "npc-beta",
            factId: "f-1",
            claim: "the bridge is weakened",
            confidence: 0.8,
            provenance: ["npc-alpha"],
            hops: 1,
          },
          evidenceRef: "r-1",
          status: "pending",
          attemptCount: "0",
          lastError: null,
          appliedAt: null,
          createdAt: new Date(),
        },
        {
          householdId: householdA,
          worldId: worldA,
          commitId,
          idempotencyKey: "rumor:npc-alpha:npc-gamma:f-1",
          intentType: "npc_rumor_spread",
          payload: {
            sourceNpcId: "npc-alpha",
            targetNpcId: "npc-gamma",
            factId: "f-1",
            claim: "the bridge is weakened",
            confidence: 0.64,
            provenance: ["npc-alpha", "npc-beta"],
            hops: 2,
          },
          evidenceRef: "r-1",
          status: "pending",
          attemptCount: "0",
          lastError: null,
          appliedAt: null,
          createdAt: new Date(),
        },
      ]);

      const applicator = new RumorSpreadApplicator();
      const propagator = new IndirectEffectPropagator(applicator);
      const result = await propagator.propagate({ householdId: householdA });

      expect(result.applied).toBe(2);
      expect(result.processed).toBe(2);

      const applied = await db
        .select()
        .from(schema.storyOutbox)
        .where(
          sql`household_id = ${householdA} AND intent_type = 'npc_rumor_spread'`,
        );
      for (const row of applied) {
        expect(row.status).toBe("applied");
      }
    });

    it("isolates a failing npc_rumor_spread intent from healthy ones", async () => {
      const commitId = "50000000-0000-4000-8000-000000000002";
      await db.insert(schema.storyOutbox).values([
        {
          householdId: householdA,
          worldId: worldA,
          commitId,
          idempotencyKey: "rumor:fail:intent",
          intentType: "npc_rumor_spread",
          payload: { bad: true },
          evidenceRef: "r-fail",
          status: "pending",
          attemptCount: "0",
          lastError: null,
          appliedAt: null,
          createdAt: new Date(),
        },
        {
          householdId: householdA,
          worldId: worldA,
          commitId,
          idempotencyKey: "rumor:good:intent",
          intentType: "npc_rumor_spread",
          payload: {
            sourceNpcId: "npc-alpha",
            targetNpcId: "npc-beta",
            factId: "f-1",
            claim: "the bridge is weakened",
            confidence: 0.8,
            provenance: ["npc-alpha"],
            hops: 1,
          },
          evidenceRef: "r-good",
          status: "pending",
          attemptCount: "0",
          lastError: null,
          appliedAt: null,
          createdAt: new Date(),
        },
      ]);

      const seen = new Set<string>();
      const propagator = new IndirectEffectPropagator({
        apply: async (row) => {
          if (row.idempotencyKey === "rumor:fail:intent") {
            throw new Error("simulated failure");
          }
          seen.add(row.idempotencyKey);
          return { writes: 1 };
        },
      });

      const result = await propagator.propagate({ householdId: householdA });

      expect(seen.has("rumor:good:intent")).toBe(true);
      expect(result.failed).toBeGreaterThanOrEqual(1);

      const good = await db
        .select()
        .from(schema.storyOutbox)
        .where(sql`idempotency_key = 'rumor:good:intent'`);
      expect(good[0]!.status).toBe("applied");
    });
  },
);