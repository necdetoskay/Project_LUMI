import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "../../src/db/schema/world";
import type { Database } from "../../src/db/client";
import {
  instantiateQuestFromSeed,
  __setTestQuestSeedAutomationDb,
  __setTestQuestSeedAutomationRepo,
} from "../../src/application/quest-seed-automation.service";
import {
  __setTestQuestTemplateDb,
  __setTestQuestTemplateRepo,
} from "../../src/application/quest-template.service";
import {
  __setTestQuestDb,
  __setTestQuestRepo,
  getQuestById,
} from "../../src/application/quest.service";
import { DrizzleQuestRepository } from "../../src/db/repositories/drizzle/drizzle-quest.repository";
import { DrizzleQuestTemplateRepository } from "../../src/db/repositories/drizzle/drizzle-quest-template.repository";

const ENABLE_DESTRUCTIVE = process.env.WORLD_TEST_ENABLE_DESTRUCTIVE === "true";
const DATABASE_URL = process.env.WORLD_TEST_DATABASE_URL;
const LUMI_DB_NAMES = ["lumi", "postgres", "template1", "template0"];

function getSafeDbName(url: string): string {
  const u = new URL(url);
  const dbName = u.pathname.replace(/^\//, "").split("?")[0]!;
  if (!dbName) {
    throw new Error(
      `[WORLD-DESTRUCTIVE-TEST] Empty DB name parsed from: ${url}`,
    );
  }
  if (LUMI_DB_NAMES.includes(dbName)) {
    throw new Error(
      `[WORLD-DESTRUCTIVE-TEST] DESTRUCTIVE TEST BLOCKED for production DB: "${dbName}".`,
    );
  }
  if (!dbName.includes("test") && !dbName.includes("review")) {
    throw new Error(`[WORLD-DESTRUCTIVE-TEST] UNSAFE DB NAME: "${dbName}".`);
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

const householdId = "20000000-0000-4000-8000-000000000012";
const worldId = "30000000-0000-4000-8000-000000000012";
const sessionId = "60000000-0000-4000-8000-000000000012";
const hookId = "70000000-0000-4000-8000-000000000012";

let pool: pg.Pool;
let queryClient: ReturnType<typeof postgres>;
let db: Database;

beforeAll(async () => {
  if (!isDestructiveEnabled()) return;

  pool = new pg.Pool({ connectionString: DATABASE_URL });
  const migrationDir = resolve(import.meta.dirname, "..", "..", "migrations");
  const files = readdirSync(migrationDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = readFileSync(resolve(migrationDir, file), "utf-8");
    await pool.query(sql);
  }

  queryClient = postgres(DATABASE_URL!, { max: 1 });
  db = drizzle(queryClient, { schema }) as unknown as Database;

  __setTestQuestSeedAutomationDb(db);
  __setTestQuestSeedAutomationRepo(new DrizzleQuestRepository());
  __setTestQuestTemplateDb(db);
  __setTestQuestTemplateRepo(new DrizzleQuestTemplateRepository());
  __setTestQuestDb(db);
  __setTestQuestRepo(new DrizzleQuestRepository());
});

afterAll(async () => {
  try {
    if (pool) {
      try {
        await pool.query("DROP SCHEMA IF EXISTS profile CASCADE");
      } catch {
        /* ignore */
      }
    }
  } finally {
    try {
      if (queryClient) {
        try {
          await queryClient.end();
        } catch {
          /* ignore */
        }
      }
      if (pool) {
        try {
          await pool.end();
        } catch {
          /* ignore */
        }
      }
    } finally {
      __setTestQuestSeedAutomationDb(undefined);
      __setTestQuestSeedAutomationRepo(undefined);
      __setTestQuestTemplateDb(undefined);
      __setTestQuestTemplateRepo(undefined);
      __setTestQuestDb(undefined);
      __setTestQuestRepo(undefined);
    }
  }
});

describe.skipIf(!isDestructiveEnabled())(
  "Quest seed automation integration",
  () => {
    it("instantiates and activates a quest from a seeded template, idempotently", async () => {
      // Template must be seeded by migration 0008.
      const first = await instantiateQuestFromSeed({
        householdId,
        worldId,
        storySessionId: sessionId,
        factId: "lost-letter",
        sourceHookId: hookId,
      });

      expect(first.created).toBe(true);
      expect(first.quest.status).toBe("active");
      expect(first.quest.title).toBe("Kayip Mektup");
      expect(first.quest.objectives).toHaveLength(2);

      const persisted = await getQuestById(first.quest.id);
      expect(persisted?.status).toBe("active");

      // Re-run with the same sourceHookId is a no-op (same quest, no duplicate).
      const second = await instantiateQuestFromSeed({
        householdId,
        worldId,
        storySessionId: sessionId,
        factId: "lost-letter",
        sourceHookId: hookId,
      });

      expect(second.created).toBe(false);
      expect(second.quest.id).toBe(first.quest.id);
    });

    it("falls back to the default template for an unmapped fact", async () => {
      const result = await instantiateQuestFromSeed({
        householdId,
        worldId,
        storySessionId: sessionId,
        factId: "some-unmapped-fact",
        sourceHookId: "70000000-0000-4000-8000-000000000013",
      });

      expect(result.created).toBe(true);
      expect(result.quest.title).toBe("Kayip Mektup");
      expect(result.quest.status).toBe("active");
    });
  },
);
