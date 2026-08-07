import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "../../src/db/schema/world";
import type { Database } from "../../src/db/client";
import {
  createQuest,
  activateQuest,
  __setTestQuestDb,
  __setTestQuestRepo,
} from "../../src/application/quest.service";
import {
  applyQuestChange,
  __setTestQuestChangeDb,
} from "../../src/application/quest-change-applicator.service";
import { DrizzleQuestRepository } from "../../src/db/repositories/drizzle/drizzle-quest.repository";

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

const householdId = "20000000-0000-4000-8000-000000000010";
const worldId = "30000000-0000-4000-8000-000000000010";

let pool: pg.Pool;
let queryClient: ReturnType<typeof postgres>;
let db: Database;
let repo: DrizzleQuestRepository;

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
  repo = new DrizzleQuestRepository();

  __setTestQuestDb(db);
  __setTestQuestChangeDb(db);
  __setTestQuestRepo(repo);
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
      __setTestQuestDb(undefined);
      __setTestQuestChangeDb(undefined);
      __setTestQuestRepo(undefined);
    }
  }
});

describe.skipIf(!isDestructiveEnabled())(
  "Quest world-change applicator integration",
  () => {
    it("applies a committed objective progression and is idempotent", async () => {
      const created = await createQuest({
        householdId,
        worldId,
        storySessionId: "60000000-0000-4000-8000-000000000010",
        title: "Find the lost letter",
        summary: "Help Stella find the owner of the lost letter.",
        objectives: [
          { title: "Question the innkeeper" },
          { title: "Return the letter" },
        ],
      });
      const questId = created.id;

      await activateQuest(questId);

      const first = await applyQuestChange({
        questId,
        objectiveIndex: 0,
        status: "completed",
        evidenceRef: "win://lost-letter/innkeeper",
      });
      expect(first).toBe("applied");

      const after = await repo.findQuestById(db, questId);
      expect(after!.version).toBeGreaterThanOrEqual(2);
      expect(after!.evidenceRef).toBe("win://lost-letter/innkeeper");

      const objectives = await repo.findObjectivesByQuestId(db, questId);
      expect(objectives[0]?.status).toBe("completed");
      expect(objectives[0]?.evidenceRef).toBe("win://lost-letter/innkeeper");

      const second = await applyQuestChange({
        questId,
        objectiveIndex: 0,
        status: "completed",
        evidenceRef: "win://lost-letter/innkeeper",
      });
      expect(second).toBe("skipped");
    });

    it("auto-completes the quest when the final objective is progressed", async () => {
      const created = await createQuest({
        householdId,
        worldId,
        title: "Two-step errand",
        summary: "Two quick errands.",
        objectives: [{ title: "A" }, { title: "B" }],
      });
      const questId = created.id;
      await activateQuest(questId);

      await applyQuestChange({
        questId,
        objectiveIndex: 0,
        status: "completed",
        evidenceRef: "evidence://a",
      });
      await applyQuestChange({
        questId,
        objectiveIndex: 1,
        status: "completed",
        evidenceRef: "evidence://b",
      });

      const after = await repo.findQuestById(db, questId);
      expect(after!.status).toBe("completed");
    });
  },
);
