import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

import { createDatabase } from "../../src/db/client";
import { TestLabCoordinator } from "../../src/test-lab/application/test-lab-coordinator";
import { pricingSnapshot } from "../../src/test-lab/domain/model-profile";
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
  candidateA: "70000000-0000-4000-8000-000000000001",
  runB: "40000000-0000-4000-8000-000000000002",
  stateB: "50000000-0000-4000-8000-000000000002",
  candidateB: "70000000-0000-4000-8000-000000000002",
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
      "0003_test_lab_model_costs.sql",
      "0004_test_lab_run_candidates.sql",
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

  it("persists isolated candidates, model pricing provenance and selected state", async () => {
    if (!enabled || !connected) return;
    const now = "2026-08-18T08:00:00.000Z";
    const pricing = pricingSnapshot({
      source: "openrouter_catalog",
      capturedAt: now,
      perTokenUsd: {
        prompt: 0.00000025,
        completion: 0.00000125,
        request: 0,
        image: 0,
        webSearch: 0,
        internalReasoning: 0,
        inputCacheRead: 0.000000025,
        inputCacheWrite: 0.00000025,
      },
    });

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
      candidateId: ids.candidateA,
      candidateStateId: ids.stateA,
      sessionId: ids.session,
      branchId: ids.branch,
      phaseId: "world",
      parentStateId: ids.state0,
      candidateState: { world: "A" },
      modelSlug: "deepseek/deepseek-chat-v3.1",
      pricingSnapshot: pricing,
      usageSnapshot: {
        promptTokens: 1000,
        completionTokens: 250,
        totalTokens: 1250,
        cachedInputTokens: 400,
        cacheWriteTokens: 0,
        reasoningTokens: 0,
        estimatedCostUsd: 0.0004725,
        actualCostUsd: 0.00045,
        upstreamInferenceCostUsd: 0.00041,
        latencyMs: 820,
        retryCount: 0,
      },
      now,
    });
    await coordinator.recordCandidate({
      runId: ids.runB,
      candidateId: ids.candidateB,
      candidateStateId: ids.stateB,
      sessionId: ids.session,
      branchId: ids.branch,
      phaseId: "world",
      parentStateId: ids.state0,
      candidateState: { world: "B" },
      now,
    });

    const persistedRun = await repository.getRun(ids.runA);
    expect(persistedRun?.modelSlug).toBe("deepseek/deepseek-chat-v3.1");
    expect(persistedRun?.pricingSnapshot?.source).toBe("openrouter_catalog");
    expect(persistedRun?.pricingSnapshot?.perMillionUsd.prompt).toBe(0.25);
    expect(persistedRun?.usageSnapshot?.estimatedCostUsd).toBe(0.0004725);
    expect(persistedRun?.usageSnapshot?.actualCostUsd).toBe(0.00045);
    expect((await repository.getCandidate(ids.candidateA))?.candidateStateId).toBe(
      ids.stateA,
    );

    await coordinator.selectCandidate({
      selectionId: ids.selectionA,
      sessionId: ids.session,
      branchId: ids.branch,
      phaseId: "world",
      runId: ids.runA,
      candidateId: ids.candidateA,
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
        candidateId: ids.candidateB,
        selectedStateId: ids.stateB,
        actor: "automation",
        strategy: "first_valid",
        createdAt: "2026-08-18T08:01:00.000Z",
      }),
    ).rejects.toThrow();

    expect((await repository.getSelection(ids.branch, "world"))?.runId).toBe(
      ids.runA,
    );
  });
});
