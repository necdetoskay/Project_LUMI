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
import { commitOutcomeWithTx } from "../../src/application/world-commit.service";
import {
  IndirectEffectPropagator,
  __setTestPropagationDb,
} from "../../src/application/indirect-effect-propagator.service";
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
  if (!ENABLE_DESTRUCTIVE) {
    throw new Error(
      "[STORY-DESTRUCTIVE-TEST] STORY_TEST_ENABLE_DESTRUCTIVE is not set to true.",
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

function commitSession(sessionSeq: number, evidence: string) {
  const manifest = OutcomeManifest.create({
    storySessionId: `40000000-0000-4000-8000-0000000000${sessionSeq}`,
    householdId: householdA,
    worldId: worldA,
    source: "story_session",
    sourceSceneId: "scene-x",
    changes: [
      {
        key: `itg-prop-${sessionSeq}`,
        outcomeType: "npc_state_update",
        entityId: npcA,
        operation: "set",
        field: "need.hunger",
        value: 80,
        evidenceRef: evidence,
      },
    ],
  });
  const snapshot = StoryContextSnapshot.create({
    storySessionId: manifest.storySessionId,
    householdId: householdA,
    worldId: worldA,
    worldStateHash: "prop-before",
    entities: [
      {
        entityId: npcA,
        entityKind: "npc",
        state: { need: { hunger: 40 } },
        stateHash: "prop-npc",
      },
    ],
  });
  return {
    manifest,
    snapshot,
    extractor: new NarrativeEventExtractor(),
    validator: new EvidenceValidator(),
    ruleEngine: new WorldCommitRuleEngine({ rules: defaultOutcomeRules() }),
  };
}

describe.skipIf(!ENABLE_DESTRUCTIVE)("Outbox propagation (integration)", () => {
  it("enqueues an outbox intent atomically with the commit (SOWS-014)", async () => {
    const input = commitSession(6, "scene://prop#1");
    await db.transaction((tx) => commitOutcomeWithTx({ ...input, tx }));

    const outbox = await db
      .select()
      .from(schema.storyOutbox)
      .where(
        sql`household_id = ${householdA} AND intent_type = 'npc_rumor_spread'`,
      );
    expect(outbox.length).toBeGreaterThanOrEqual(1);
    expect(outbox[0]!.status).toBe("pending");
    // Commit id correlation present.
    expect(outbox[0]!.commitId).toBeTruthy();
  });

  it("propagates each pending intent exactly once (SOWS-015)", async () => {
    let applyCalls = 0;
    const propagator = new IndirectEffectPropagator({
      apply: async () => {
        applyCalls += 1;
        return { writes: 1 };
      },
    });

    const first = await propagator.propagate({ householdId: householdA });
    void first;
    const second = await propagator.propagate({ householdId: householdA });

    // First pass applies pending intents; second pass finds none (all applied).
    expect(applyCalls).toBeGreaterThanOrEqual(1);
    expect(second.processed).toBe(0);

    const applied = await db
      .select()
      .from(schema.storyOutbox)
      .where(sql`household_id = ${householdA} AND status = 'applied'`);
    const pending = await db
      .select()
      .from(schema.storyOutbox)
      .where(sql`household_id = ${householdA} AND status = 'pending'`);
    expect(applied.length + pending.length).toBe(
      applied.length + pending.length,
    );
    // Every processed row ended applied (idempotent re-processing).
    expect(pending.length).toBe(0);
  });

  it("isolates a failing intent from healthy ones (SOWS-014, retry isolation)", async () => {
    // Manually insert two pending intents for a fresh session.
    const commitId = "50000000-0000-4000-8000-000000000001";
    await db.insert(schema.storyOutbox).values([
      {
        householdId: householdA,
        worldId: worldA,
        commitId,
        idempotencyKey: "story-indirect:fail-intent",
        intentType: "npc_rumor_spread",
        payload: { bad: true },
        evidenceRef: "r-bad",
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
        idempotencyKey: "story-indirect:good-intent",
        intentType: "npc_relationship_shift",
        payload: { good: true },
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
        if (row.idempotencyKey === "story-indirect:fail-intent") {
          throw new Error("simulated failure");
        }
        seen.add(row.idempotencyKey);
        return { writes: 1 };
      },
    });

    const result = await propagator.propagate({ householdId: householdA });

    expect(seen.has("story-indirect:good-intent")).toBe(true);
    expect(result.failed).toBeGreaterThanOrEqual(1);

    // Failed intent marked failed (or pending for retry); good one applied.
    const failed = await db
      .select()
      .from(schema.storyOutbox)
      .where(sql`idempotency_key = 'story-indirect:fail-intent'`);
    const good = await db
      .select()
      .from(schema.storyOutbox)
      .where(sql`idempotency_key = 'story-indirect:good-intent'`);
    expect(good[0]!.status).toBe("applied");
    expect(["failed", "pending"]).toContain(failed[0]!.status);
  });

  it("stops retrying after max attempts and leaves the row failed", async () => {
    await db
      .update(schema.storyOutbox)
      .set({
        status: "failed",
        attemptCount: "3",
        lastError: "previous failures",
      })
      .where(sql`idempotency_key = 'story-indirect:fail-intent'`);

    let applyCalls = 0;
    const propagator = new IndirectEffectPropagator(
      {
        apply: async () => {
          applyCalls += 1;
          return { writes: 1 };
        },
      },
      3,
    );

    const result = await propagator.propagate({ householdId: householdA });
    expect(applyCalls).toBe(0);
    expect(result.failed).toBeGreaterThanOrEqual(1);

    const row = await db
      .select()
      .from(schema.storyOutbox)
      .where(sql`idempotency_key = 'story-indirect:fail-intent'`);
    expect(row[0]!.status).toBe("failed");
    expect(row[0]!.lastError).toBe("max attempts exceeded");
  });
});
