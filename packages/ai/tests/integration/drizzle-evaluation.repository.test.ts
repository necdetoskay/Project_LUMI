import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

import { createDatabase } from "../../src/db/client";
import { DrizzleEvaluationRepository } from "../../src/test-lab/infrastructure/drizzle-evaluation-repository";
import { DrizzleTestLabRepository } from "../../src/test-lab/infrastructure/drizzle-test-lab-repository";
import { TestLabCoordinator } from "../../src/test-lab/application/test-lab-coordinator";
import { STORY_QUALITY_RUBRIC_V1 } from "../../src/test-lab/domain/evaluation";

const enabled = process.env.AI_TEST_ENABLE_DESTRUCTIVE === "true";
const dbUrl =
  process.env.DATABASE_URL ??
  "postgresql://lumi:lumi_local_only@localhost:15432/lumi";

const ids = {
  session: "11000000-0000-4000-8000-000000000001",
  branch: "21000000-0000-4000-8000-000000000001",
  state0: "31000000-0000-4000-8000-000000000001",
  run: "41000000-0000-4000-8000-000000000001",
  state: "51000000-0000-4000-8000-000000000001",
  candidate: "71000000-0000-4000-8000-000000000001",
  execution: "81000000-0000-4000-8000-000000000001",
  evaluation: "91000000-0000-4000-8000-000000000001",
} as const;

describe("DrizzleEvaluationRepository integration", () => {
  let pool: pg.Pool | undefined;
  let repository: DrizzleEvaluationRepository;
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
      "0005_test_lab_execution_provenance.sql",
      "0006_test_lab_evaluation_engine.sql",
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

    const db = createDatabase(dbUrl);
    const testLabRepository = new DrizzleTestLabRepository(db);
    const coordinator = new TestLabCoordinator(testLabRepository);
    await coordinator.createSession({
      sessionId: ids.session,
      branchId: ids.branch,
      scenarioKey: "story_generation",
      initialStateId: ids.state0,
      initialState: { storyLab: { stories: [] } },
      now: "2026-08-18T14:00:00.000Z",
    });
    await coordinator.recordCandidate({
      runId: ids.run,
      candidateId: ids.candidate,
      candidateStateId: ids.state,
      sessionId: ids.session,
      branchId: ids.branch,
      phaseId: "story_001",
      parentStateId: ids.state0,
      candidateState: { storyLab: { stories: [{ title: "A" }] } },
      now: "2026-08-18T14:00:01.000Z",
    });
    repository = new DrizzleEvaluationRepository(db);
  });

  afterAll(async () => {
    if (pool) {
      await pool
        .query("DROP SCHEMA IF EXISTS ai CASCADE")
        .catch(() => undefined);
      await pool.end();
    }
  });

  it("persists immutable rubric revisions and one execution-level usage snapshot", async () => {
    if (!enabled || !connected) return;

    await repository.saveRubric(STORY_QUALITY_RUBRIC_V1);
    await expect(
      repository.saveRubric(STORY_QUALITY_RUBRIC_V1),
    ).rejects.toThrow();

    await repository.saveExecution({
      id: ids.execution,
      sessionId: ids.session,
      rubricKey: "story_quality",
      rubricRevision: 1,
      mode: "blind_ranking",
      authorType: "judge",
      authorId: "judge-1",
      judgeModelSlug: "openai/gpt-4.1-mini",
      usageSnapshot: {
        promptTokens: 1000,
        completionTokens: 300,
        totalTokens: 1300,
        estimatedCostUsd: 0.0045,
        actualCostUsd: 0.0042,
        latencyMs: 1750,
      },
      provenance: { provider: "openrouter", blind: true },
      createdAt: "2026-08-18T14:00:02.000Z",
    });
    await repository.saveEvaluation({
      id: ids.evaluation,
      evaluationExecutionId: ids.execution,
      sessionId: ids.session,
      runId: ids.run,
      candidateId: ids.candidate,
      rubricKey: "story_quality",
      rubricRevision: 1,
      mode: "blind_ranking",
      authorType: "judge",
      authorId: "judge-1",
      judgeModelSlug: "openai/gpt-4.1-mini",
      findings: [
        {
          criterionKey: "continuity",
          score: 8,
          finding: "Selected history is preserved.",
          evidence: "The story references the prior event.",
        },
      ],
      overallScore: 8,
      rank: 1,
      createdAt: "2026-08-18T14:00:02.000Z",
    });

    expect(
      (await repository.getExecution(ids.execution))?.usageSnapshot,
    ).toEqual({
      promptTokens: 1000,
      completionTokens: 300,
      totalTokens: 1300,
      estimatedCostUsd: 0.0045,
      actualCostUsd: 0.0042,
      latencyMs: 1750,
    });
    expect(
      (await repository.listCandidateEvaluations(ids.candidate))[0]
        ?.evaluationExecutionId,
    ).toBe(ids.execution);
  });
});
