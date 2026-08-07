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
import { StoryHookDeliveryApplicator } from "../../src/application/story-hook-delivery-applicator.service";
import { __setTestCommitDb } from "../../src/application/world-commit.service";

const ENABLE_DESTRUCTIVE = process.env.STORY_TEST_ENABLE_DESTRUCTIVE === "true";
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

const householdA = "20000000-0000-4000-8000-000000000002";
const worldA = "30000000-0000-4000-8000-000000000002";

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
  for (const file of ["0004_story_outbox.sql", "0005_story_hooks.sql"]) {
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
  "Story hook delivery outbox integration",
  () => {
    it("delivers a story_hook_delivery intent and marks it applied", async () => {
      const hookId = "40000000-0000-4000-8000-000000000001";
      const commitId = "50000000-0000-4000-8000-000000000011";
      await db.insert(schema.storyOutbox).values([
        {
          householdId: householdA,
          worldId: worldA,
          commitId,
          idempotencyKey: "story-hook:opp-1",
          intentType: "story_hook_delivery",
          payload: {
            hookId,
            opportunityId: "opp-1",
            hookType: "gift",
            sceneType: "choice",
            storySessionId: "60000000-0000-4000-8000-000000000001",
            sourceNpcId: "10000000-0000-4000-8000-000000000005",
          },
          evidenceRef: `hook://${hookId}`,
          status: "pending",
          attemptCount: "0",
          lastError: null,
          appliedAt: null,
          createdAt: new Date(),
        },
      ]);

      const applicator = new StoryHookDeliveryApplicator();
      const propagator = new IndirectEffectPropagator(applicator);
      const result = await propagator.propagate({ householdId: householdA });

      expect(result.processed).toBe(1);
      expect(result.applied).toBe(1);
      expect(result.failed).toBe(0);

      const rows = await db
        .select()
        .from(schema.storyOutbox)
        .where(sql`idempotency_key = 'story-hook:opp-1'`);
      expect(rows[0]!.status).toBe("applied");
      expect(rows[0]!.attemptCount).toBe("1");
    });

    it("marks an invalid story_hook_delivery intent applied with zero writes", async () => {
      const commitId = "50000000-0000-4000-8000-000000000012";
      await db.insert(schema.storyOutbox).values([
        {
          householdId: householdA,
          worldId: worldA,
          commitId,
          idempotencyKey: "story-hook:opp-2",
          intentType: "story_hook_delivery",
          payload: { hookId: "h-2", opportunityId: "opp-2" },
          evidenceRef: "hook://h-2",
          status: "pending",
          attemptCount: "0",
          lastError: null,
          appliedAt: null,
          createdAt: new Date(),
        },
      ]);

      const applicator = new StoryHookDeliveryApplicator();
      const propagator = new IndirectEffectPropagator(applicator);
      const result = await propagator.propagate({ householdId: householdA });

      expect(result.processed).toBe(1);
      expect(result.applied).toBe(1);
      expect(result.failed).toBe(0);

      const rows = await db
        .select()
        .from(schema.storyOutbox)
        .where(sql`idempotency_key = 'story-hook:opp-2'`);
      expect(rows[0]!.status).toBe("applied");
    });
  },
);
