import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

import { createDatabase } from "../../src/db/client";
import { DrizzleNpcDecisionRepository } from "../../src/db/repositories/drizzle/drizzle-npc-decision.repository";
import {
  makeDecisionEvent,
  makeDecisionTrace,
} from "../fixtures/decision.fixtures";

const enabled = process.env.NPC_TEST_ENABLE_DESTRUCTIVE === "true";
const dbUrl =
  process.env.DATABASE_URL ??
  "postgresql://lumi:lumi_local_only@localhost:15432/lumi";

describe("DrizzleNpcDecisionRepository integration", () => {
  let pool: pg.Pool | undefined;
  let db: ReturnType<typeof createDatabase>;
  let repo: DrizzleNpcDecisionRepository;
  let connected = false;

  beforeAll(async () => {
    if (!enabled) return;

    pool = new pg.Pool({ connectionString: dbUrl });
    try {
      await pool.query("SELECT 1");
      connected = true;
    } catch {
      return;
    }

    const migrationPath = path.resolve(
      import.meta.dirname,
      "..",
      "..",
      "migrations",
      "0001_npc_intelligence_schema.sql",
    );
    const migrationSql = readFileSync(migrationPath, "utf-8");

    await pool.query("DROP SCHEMA IF EXISTS npc_intelligence CASCADE");
    await pool.query(migrationSql);

    db = createDatabase(dbUrl);
    repo = new DrizzleNpcDecisionRepository(db);
  });

  afterAll(async () => {
    if (pool) {
      await pool
        .query("DROP SCHEMA IF EXISTS npc_intelligence CASCADE")
        .catch(() => undefined);
      await pool.end();
    }
  });

  it("persists and lists decision traces for an npc", async () => {
    if (!enabled || !connected) return;

    const trace = makeDecisionTrace();
    await repo.saveTrace(trace);

    const traces = await repo.listTraces(trace.householdId, trace.npcId, 10);
    expect(traces).toHaveLength(1);
    expect(traces[0]).toMatchObject({
      traceId: trace.traceId,
      seed: "seed-1",
      selectedCandidateId: "seek_food:self",
    });
    expect(traces[0]?.decidedAt.toISOString()).toBe("2026-01-01T10:00:00.000Z");
  });

  it("stores the full trace json including steps and scores", async () => {
    if (!enabled || !connected) return;

    const trace = makeDecisionTrace({
      traceId: "f4a3b2c1-0000-0000-0000-000000000001",
    });
    await repo.saveTrace(trace);

    const traces = await repo.listTraces(trace.householdId, trace.npcId, 10);
    const stored = traces.find((t) => t.traceId === trace.traceId);
    expect(stored?.steps).toHaveLength(1);
    expect(stored?.scores[0]?.policyVersion).toBe("v1");
    expect(stored?.candidates[0]?.kind).toBe("seek_food");
  });

  it("isolates traces by household and npc", async () => {
    if (!enabled || !connected) return;

    const trace = makeDecisionTrace({
      traceId: "f4a3b2c1-0000-0000-0000-000000000002",
      householdId: "22222222-2222-2222-2222-222222222222",
    });
    await repo.saveTrace(trace);

    const otherHousehold = await repo.listTraces(
      "11111111-1111-1111-1111-111111111111",
      trace.npcId,
      10,
    );
    expect(otherHousehold.some((t) => t.traceId === trace.traceId)).toBe(false);
  });

  it("saves decision events idempotently", async () => {
    if (!enabled || !connected) return;

    const event = makeDecisionEvent();
    await repo.saveEvent(event);
    await repo.saveEvent(event);

    const result = await pool!.query(
      "SELECT COUNT(*)::int AS count FROM npc_intelligence.decision_events WHERE id = $1",
      [event.id],
    );
    expect(result.rows[0]?.count).toBe(1);
  });
});
