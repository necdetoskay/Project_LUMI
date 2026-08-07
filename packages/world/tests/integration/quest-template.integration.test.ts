import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "../../src/db/schema/world";
import type { Database } from "../../src/db/client";
import {
  createQuestTemplate,
  getQuestTemplateByKey,
  instantiateQuestFromTemplate,
  __setTestQuestTemplateDb,
  __setTestQuestTemplateRepo,
} from "../../src/application/quest-template.service";
import {
  __setTestQuestDb,
  __setTestQuestRepo,
  getQuestById,
} from "../../src/application/quest.service";
import { DrizzleQuestTemplateRepository } from "../../src/db/repositories/drizzle/drizzle-quest-template.repository";
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

const householdId = "20000000-0000-4000-8000-000000000011";
const worldId = "30000000-0000-4000-8000-000000000011";

let pool: pg.Pool;
let queryClient: ReturnType<typeof postgres>;
let db: Database;
let templateRepo: DrizzleQuestTemplateRepository;
let questRepo: DrizzleQuestRepository;

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
  templateRepo = new DrizzleQuestTemplateRepository();
  questRepo = new DrizzleQuestRepository();

  __setTestQuestTemplateDb(db);
  __setTestQuestTemplateRepo(templateRepo);
  __setTestQuestDb(db);
  __setTestQuestRepo(questRepo);
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
      __setTestQuestTemplateDb(undefined);
      __setTestQuestTemplateRepo(undefined);
      __setTestQuestDb(undefined);
      __setTestQuestRepo(undefined);
    }
  }
});

describe.skipIf(!isDestructiveEnabled())("Quest template integration", () => {
  it("creates a template, reads it, and instantiates it into a quest", async () => {
    const template = await createQuestTemplate({
      templateKey: "lost-letter-quest",
      displayName: "The Lost Letter",
      description: "Find the owner of the lost letter.",
      objectives: [
        { objectiveKey: "ask-shopkeeper", title: "Ask the shopkeeper" },
        { objectiveKey: "deliver-letter", title: "Deliver the letter" },
      ],
    });
    expect(template.templateKey).toBe("lost-letter-quest");
    expect(template.objectives).toHaveLength(2);

    const byKey = await getQuestTemplateByKey("lost-letter-quest");
    expect(byKey?.templateKey).toBe("lost-letter-quest");

    const quest = await instantiateQuestFromTemplate({
      templateKey: "lost-letter-quest",
      householdId,
      worldId,
      storySessionId: "60000000-0000-4000-8000-000000000011",
    });
    expect(quest.status).toBe("inactive");
    expect(quest.title).toBe("The Lost Letter");
    expect(quest.objectives).toHaveLength(2);
    expect(quest.objectives[0]?.title).toBe("Ask the shopkeeper");

    const persisted = await getQuestById(quest.id);
    expect(persisted).not.toBeNull();
    expect(persisted?.objectives).toHaveLength(2);
  });

  it("rejects a duplicate template key", async () => {
    await expect(
      createQuestTemplate({
        templateKey: "lost-letter-quest",
        displayName: "Dup",
        description: "dup",
        objectives: [{ objectiveKey: "o1", title: "x" }],
      }),
    ).rejects.toMatchObject({ code: "QUEST_TEMPLATE_KEY_EXISTS" });
  });
});
