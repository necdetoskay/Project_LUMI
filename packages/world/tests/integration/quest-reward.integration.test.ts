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
  getQuestById,
} from "../../src/application/quest.service";
import {
  applyQuestChange,
  __setTestQuestChangeDb,
  __setTestQuestChangeRepo,
} from "../../src/application/quest-change-applicator.service";
import { planQuestReward } from "../../src/domain/quest-reward-planner";
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

const householdId = "20000000-0000-4000-8000-000000000014";
const worldId = "30000000-0000-4000-8000-000000000014";

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
  __setTestQuestRepo(repo);
  __setTestQuestChangeDb(db);
  __setTestQuestChangeRepo(repo);
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
      __setTestQuestRepo(undefined);
      __setTestQuestChangeDb(undefined);
      __setTestQuestChangeRepo(undefined);
    }
  }
});

describe.skipIf(!isDestructiveEnabled())("Quest reward integration", () => {
  it("plans a reward when the final objective auto-completes a quest", async () => {
    const created = await createQuest({
      householdId,
      worldId,
      title: "Reward quest",
      summary: "Earn a reward.",
      objectives: [{ title: "A" }, { title: "B" }],
      reward: { itemDefinitionKey: "golden-compass", quantity: 1 },
    });
    const questId = created.id;

    await activateQuest(questId);

    const first = await applyQuestChange({
      questId,
      objectiveIndex: 0,
      status: "completed",
      evidenceRef: "evidence://a",
    });
    expect(first.status).toBe("applied");
    expect(first.questCompleted).toBe(false);
    expect(first.reward).toBeNull();

    const second = await applyQuestChange({
      questId,
      objectiveIndex: 1,
      status: "completed",
      evidenceRef: "evidence://b",
    });
    expect(second.status).toBe("applied");
    expect(second.questCompleted).toBe(true);
    expect(second.reward).toEqual({
      itemDefinitionKey: "golden-compass",
      quantity: 1,
    });

    const persisted = await getQuestById(questId);
    expect(persisted?.status).toBe("completed");
    expect(persisted?.reward).toEqual({
      itemDefinitionKey: "golden-compass",
      quantity: 1,
    });

    const intent = planQuestReward(persisted!);
    expect(intent).not.toBeNull();
    expect(intent!.reward).toEqual({
      itemDefinitionKey: "golden-compass",
      quantity: 1,
    });

    // Re-applying the same objective is a no-op (no double reward).
    const replay = await applyQuestChange({
      questId,
      objectiveIndex: 1,
      status: "completed",
      evidenceRef: "evidence://b",
    });
    expect(replay.status).toBe("skipped");
    expect(replay.questCompleted).toBe(false);
    expect(replay.reward).toBeNull();
  });
});
