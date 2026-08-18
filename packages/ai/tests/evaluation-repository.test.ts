import { describe, expect, it } from "vitest";

import {
  InMemoryEvaluationRepository,
  STORY_QUALITY_RUBRIC_V1,
} from "../src/test-lab";
import type { CandidateEvaluation, EvaluationExecution } from "../src/test-lab";

describe("evaluation repository", () => {
  it("stores immutable rubric revisions independently", async () => {
    const repository = new InMemoryEvaluationRepository();
    await repository.saveRubric(STORY_QUALITY_RUBRIC_V1);
    await repository.saveRubric({
      ...STORY_QUALITY_RUBRIC_V1,
      revision: 2,
      label: "LUMI Story Quality v2",
      createdAt: "2026-08-18T01:00:00.000Z",
    });

    await expect(
      repository.saveRubric(STORY_QUALITY_RUBRIC_V1),
    ).rejects.toThrow("TEST_LAB_EVALUATION_RUBRIC_EXISTS:story_quality@1");
    expect(
      (await repository.listRubricRevisions("story_quality")).map(
        (rubric) => rubric.revision,
      ),
    ).toEqual([1, 2]);
  });

  it("stores execution provenance once while keeping judge and human scores separate", async () => {
    const repository = new InMemoryEvaluationRepository();
    const judgeExecution = execution({
      id: "exec-judge",
      authorType: "judge",
      authorId: "judge-a",
      judgeModelSlug: "openai/gpt-4.1-mini",
      usageSnapshot: {
        promptTokens: 100,
        completionTokens: 20,
        totalTokens: 120,
        estimatedCostUsd: 0.001,
        actualCostUsd: null,
        latencyMs: 500,
      },
    });
    const humanExecution = execution({
      id: "exec-human",
      authorType: "human",
      authorId: "parent-1",
      judgeModelSlug: null,
      usageSnapshot: null,
    });
    await repository.saveExecution(judgeExecution);
    await repository.saveExecution(humanExecution);

    await repository.saveEvaluation(
      evaluation({
        id: "eval-judge",
        evaluationExecutionId: judgeExecution.id,
        authorType: "judge",
        authorId: "judge-a",
        judgeModelSlug: "openai/gpt-4.1-mini",
        overallScore: 8.4,
      }),
    );
    await repository.saveEvaluation(
      evaluation({
        id: "eval-human",
        evaluationExecutionId: humanExecution.id,
        authorType: "human",
        authorId: "parent-1",
        judgeModelSlug: null,
        overallScore: 9,
      }),
    );

    expect(
      (await repository.getExecution("exec-judge"))?.usageSnapshot,
    ).toEqual(judgeExecution.usageSnapshot);
    const stored = await repository.listCandidateEvaluations("candidate-1");
    expect(stored).toHaveLength(2);
    expect(
      stored.find((item) => item.authorType === "judge")?.judgeModelSlug,
    ).toBe("openai/gpt-4.1-mini");
    expect(
      stored.find((item) => item.authorType === "human")?.judgeModelSlug,
    ).toBeNull();
  });
});

function execution(
  overrides: Partial<EvaluationExecution>,
): EvaluationExecution {
  return {
    id: "exec-1",
    sessionId: "session-1",
    rubricKey: "story_quality",
    rubricRevision: 1,
    mode: "absolute",
    authorType: "judge",
    authorId: "judge-a",
    judgeModelSlug: "openai/gpt-4.1-mini",
    usageSnapshot: null,
    provenance: null,
    createdAt: "2026-08-18T00:00:00.000Z",
    ...overrides,
  };
}

function evaluation(
  overrides: Partial<CandidateEvaluation>,
): CandidateEvaluation {
  return {
    id: "eval-1",
    evaluationExecutionId: "exec-1",
    sessionId: "session-1",
    runId: "run-1",
    candidateId: "candidate-1",
    rubricKey: "story_quality",
    rubricRevision: 1,
    mode: "absolute",
    authorType: "judge",
    authorId: "judge-a",
    judgeModelSlug: "openai/gpt-4.1-mini",
    findings: [],
    overallScore: 8,
    rank: null,
    createdAt: "2026-08-18T00:00:00.000Z",
    ...overrides,
  };
}
