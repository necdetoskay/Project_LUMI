import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

import { createDatabase } from "../../src/db/client";
import { TestLabCoordinator } from "../../src/test-lab/application/test-lab-coordinator";
import { DrizzleTestLabRepository } from "../../src/test-lab/infrastructure/drizzle-test-lab-repository";

const enabled = process.env.AI_TEST_ENABLE_DESTRUCTIVE === "true";
const dbUrl =
  process.env.DATABASE_URL ??
  "postgresql://lumi:lumi_local_only@localhost:15432/lumi";

const ids = {
  session: "10000000-0000-4000-8000-000000000001",
  branch: "20000000-0000-4000-8000-000000000001",
  state0: "30000000-0000-4000-8000-000000000001",
  runA: "40000000-0000-4000-8000-000000000001",
  stateA: "50000000-0000-4000-8000-000000000001",
  runB: "40000000-0000-4000-8000-000000000002",
  stateB: "50000000-0000-4000-8000-000000000002",
  selectionA: "60000000-0000-4000-8000-000000000001",
  selectionB: "60000000-0000-4000-8000-000000000002",
} as const;

describe("DrizzleTestLabRepository integration", () => {
  let pool: pg.Pool | undefined;
  let repository: DrizzleTestLabRepository;
  let coordinator: TestLabCoordinator;
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

    await pool.query("DROP SCHEMA IF EXISTS ai CASCADE");
    for (const migration of [
      "0001_ai_usage_schema.sql",
      "0002_test_lab_foundation.sql",
    ]) {
      const migrationPath = path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "migrations",
        migration,
      );
      await pool.query(readFileSync(migrationPath, "utf-8"));
    }

    repository = new DrizzleTestLabRepository(createDatabase(dbUrl));
    coordinator = new TestLabCoordinator(repository);
  });

  afterAll(async () => {
    if (pool) {
      await pool
        .query("DROP SCHEMA IF EXISTS ai CASCADE")
        .catch(() => undefined);
      await pool.end();
    }
  });

  it("persists isolated candidates and advances only the selected state", async () => {
    if (!enabled || !connected) return;
    const now = "2026-08-18T08:00:00.000Z";

    await coordinator.createSession({
      sessionId: ids.session,
      branchId: ids.branch,
      scenarioKey: "character_onboarding",
      initialStateId: ids.state0,
      initialState: { world: null },
      now,
    });

    await coordinator.recordCandidate({
      runId: ids.runA,
      candidateStateId: ids.stateA,
      sessionId: ids.session,
      branchId: ids.branch,
      phaseId: "world",
      parentStateId: ids.state0,
      candidateState: { world: "A" },
      now,
    });
    await coordinator.recordCandidate({
      runId: ids.runB,
      candidateStateId: ids.stateB,
      sessionId: ids.session,
      branchId: ids.branch,
      phaseId: "world",
      parentStateId: ids.state0,
      candidateState: { world: "B" },
      now,
    });

    await coordinator.selectCandidate({
      selectionId: ids.selectionA,
      sessionId: ids.session,
      branchId: ids.branch,
      phaseId: "world",
      runId: ids.runA,
      actor: "human",
      now,
    });

    expect(
      (await repository.getSelection(ids.branch, "world"))?.selectedStateId,
    ).toBe(ids.stateA);
    expect((await repository.getState(ids.stateB))?.value).toEqual({
      world: "B",
    });
  });

  it("enforces one selection per session/branch/phase at the database boundary", async () => {
    if (!enabled || !connected) return;

    await expect(
      repository.saveSelection({
        id: ids.selectionB,
        sessionId: ids.session,
        branchId: ids.branch,
        phaseId: "world",
        runId: ids.runB,
        selectedStateId: ids.stateB,
        actor: "automation",
        strategy: "first_valid",
        createdAt: "2026-08-18T08:01:00.000Z",
      }),
    ).rejects.toThrow();

    expect(
      (await repository.getSelection(ids.branch, "world"))?.runId,
    ).toBe(ids.runA);
  });
});
