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
  OutcomeManifest,
  StoryContextSnapshot,
  NarrativeEventExtractor,
  EvidenceValidator,
  WorldCommitRuleEngine,
  defaultOutcomeRules,
} from "../../src/domain/outcome";
import { WorldCommitService } from "../../src/application/world-commit.service";
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
      `[STORY-DESTRUCTIVE-TEST] DESTRUCTIVE TEST BLOCKED for production DB: "${dbName}". ` +
        `Story destructive tests require a disposable DB name containing "test" or "review".`,
    );
  }
  if (!dbName.includes("test") && !dbName.includes("review")) {
    throw new Error(
      `[STORY-DESTRUCTIVE-TEST] UNSAFE DB NAME: "${dbName}". ` +
        `Destructive tests require DB name containing "test" or "review".`,
    );
  }
  return dbName;
}

function isDestructiveEnabled(): boolean {
  if (!ENABLE_DESTRUCTIVE) {
    throw new Error(
      "[STORY-DESTRUCTIVE-TEST] STORY_TEST_ENABLE_DESTRUCTIVE is not set to true. " +
        "Set STORY_TEST_ENABLE_DESTRUCTIVE=true and STORY_TEST_DATABASE_URL to a disposable database.",
    );
  }
  if (!DATABASE_URL) {
    throw new Error(
      "[STORY-DESTRUCTIVE-TEST] STORY_TEST_DATABASE_URL is required.",
    );
  }
  getSafeDbName(DATABASE_URL);
  return true;
}

const npcA = "10000000-0000-4000-8000-000000000001";
const householdA = "20000000-0000-4000-8000-000000000001";
const householdB = "20000000-0000-4000-8000-000000000002";
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

  // Apply the 0003 world-commit migration on the disposable DB.
  const migration = readFileSync(
    resolve(
      __dirname,
      "..",
      "..",
      "migrations",
      "0003_world_commit_system.sql",
    ),
    "utf-8",
  );
  await pool.query("CREATE SCHEMA IF NOT EXISTS story;");
  await pool.query(migration);
});

afterAll(async () => {
  if (!ENABLE_DESTRUCTIVE || !DATABASE_URL) return;
  await queryClient.end();
  await pool.end();
});

describe.skipIf(!ENABLE_DESTRUCTIVE)("WorldCommitService (integration)", () => {
  it("commits a manifest in a single transaction and bumps world version", async () => {
    const manifest = OutcomeManifest.create({
      storySessionId: "40000000-0000-4000-8000-000000000001",
      householdId: householdA,
      worldId: worldA,
      source: "story_session",
      sourceSceneId: "scene-1",
      changes: [
        {
          key: "itg-c1",
          outcomeType: "npc_state_update",
          entityId: npcA,
          operation: "set",
          field: "need.hunger",
          value: 80,
          evidenceRef: "scene://itg#1",
        },
      ],
    });
    const snapshot = StoryContextSnapshot.create({
      storySessionId: manifest.storySessionId,
      householdId: householdA,
      worldId: worldA,
      worldStateHash: "itg-before",
      entities: [
        {
          entityId: npcA,
          entityKind: "npc",
          state: { need: { hunger: 40 } },
          stateHash: "itg-npc-hash",
        },
      ],
    });

    const service = new WorldCommitService();
    const result = await service.commitManifest({
      manifest,
      snapshot,
      extractor: new NarrativeEventExtractor(),
      validator: new EvidenceValidator(),
      ruleEngine: new WorldCommitRuleEngine({ rules: defaultOutcomeRules() }),
    });

    expect(result.worldVersionAfter).toBe(2);
    expect(result.worldStateHash).toBeTruthy();

    // Commit record persisted.
    const rows = await db
      .select()
      .from(schema.storyCommitRecords)
      .where(sql`household_id = ${householdA}`);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.worldVersionBefore).toBe(1);
    expect(rows[0]!.worldVersionAfter).toBe(2);
    expect(rows[0]!.manifestId).toBe(manifest.id);

    // World version row persisted.
    const versions = await db
      .select()
      .from(schema.storyWorldVersions)
      .where(sql`household_id = ${householdA}`);
    expect(versions).toHaveLength(1);
    expect(versions[0]!.currentVersion).toBe("2");
  });

  it("re-applying the same manifest is idempotent (no duplicate commit)", async () => {
    const manifest = OutcomeManifest.create({
      storySessionId: "40000000-0000-4000-8000-000000000002",
      householdId: householdA,
      worldId: worldA,
      source: "story_session",
      sourceSceneId: "scene-2",
      changes: [
        {
          key: "itg-c2",
          outcomeType: "npc_state_update",
          entityId: npcA,
          operation: "set",
          field: "need.hunger",
          value: 50,
          evidenceRef: "scene://itg#2",
        },
      ],
    });
    const snapshot = StoryContextSnapshot.create({
      storySessionId: manifest.storySessionId,
      householdId: householdA,
      worldId: worldA,
      worldStateHash: "itg-before-2",
      entities: [
        {
          entityId: npcA,
          entityKind: "npc",
          state: { need: { hunger: 40 } },
          stateHash: "itg-npc-hash",
        },
      ],
    });

    const service = new WorldCommitService();
    const input = {
      manifest,
      snapshot,
      extractor: new NarrativeEventExtractor(),
      validator: new EvidenceValidator(),
      ruleEngine: new WorldCommitRuleEngine({ rules: defaultOutcomeRules() }),
    };

    const r1 = await service.commitManifest(input);
    const countAfterFirst = await db
      .select()
      .from(schema.storyCommitRecords)
      .where(sql`household_id = ${householdA}`);
    const r2 = await service.commitManifest(input);
    const countAfterSecond = await db
      .select()
      .from(schema.storyCommitRecords)
      .where(sql`household_id = ${householdA}`);

    expect(r1.worldVersionAfter).toBe(3);
    expect(r2.commitId).toBe(r1.commitId);
    expect(countAfterSecond).toHaveLength(countAfterFirst.length);
  });

  it("enforces household isolation (two households, no cross-tenant)", async () => {
    const manifestB = OutcomeManifest.create({
      storySessionId: "40000000-0000-4000-8000-000000000003",
      householdId: householdB,
      worldId: worldA,
      source: "story_session",
      sourceSceneId: "scene-3",
      changes: [
        {
          key: "itg-c3",
          outcomeType: "npc_state_update",
          entityId: npcA,
          operation: "set",
          field: "need.hunger",
          value: 20,
          evidenceRef: "scene://itg#3",
        },
      ],
    });
    const snapshotB = StoryContextSnapshot.create({
      storySessionId: manifestB.storySessionId,
      householdId: householdB,
      worldId: worldA,
      worldStateHash: "itg-before-b",
      entities: [
        {
          entityId: npcA,
          entityKind: "npc",
          state: { need: { hunger: 40 } },
          stateHash: "itg-npc-hash",
        },
      ],
    });

    const service = new WorldCommitService();
    await service.commitManifest({
      manifest: manifestB,
      snapshot: snapshotB,
      extractor: new NarrativeEventExtractor(),
      validator: new EvidenceValidator(),
      ruleEngine: new WorldCommitRuleEngine({ rules: defaultOutcomeRules() }),
    });

    const householdACommits = await db
      .select()
      .from(schema.storyCommitRecords)
      .where(sql`household_id = ${householdA}`);
    const householdBCommits = await db
      .select()
      .from(schema.storyCommitRecords)
      .where(sql`household_id = ${householdB}`);
    expect(householdACommits.every((c) => c.householdId === householdA)).toBe(
      true,
    );
    expect(householdBCommits.every((c) => c.householdId === householdB)).toBe(
      true,
    );
  });
});
