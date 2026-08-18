import { describe, expect, it } from "vitest";

import {
  EvaluationRunner,
  InMemoryEvaluationRepository,
  STORY_QUALITY_RUBRIC_V1,
} from "../src/test-lab";
import type {
  EvaluationJudgeAdapter,
  EvaluationJudgeRequest,
} from "../src/test-lab";

describe("EvaluationRunner", () => {
  it("sends blind candidates to one judge execution and persists call cost once", async () => {
    const repository = new InMemoryEvaluationRepository();
    await repository.saveRubric(STORY_QUALITY_RUBRIC_V1);
    const capturedRequests: EvaluationJudgeRequest[] = [];
    const adapter: EvaluationJudgeAdapter = {
      async evaluate(request) {
        capturedRequests.push(request);
        return {
          judgeId: "judge-1",
          judgeModelSlug: request.judgeModelSlug,
          candidates: request.candidates.map((candidate, index) => ({
            candidateLabel: candidate.label,
            findings: request.rubric.criteria.map((criterion) => ({
              criterionKey: criterion.key,
              score: index === 0 ? 8 : 6,
              finding: `${criterion.key} finding`,
              evidence: "Concrete candidate evidence",
            })),
            rank: index + 1,
          })),
          usageSnapshot: {
            promptTokens: 900,
            completionTokens: 300,
            totalTokens: 1200,
            estimatedCostUsd: 0.0042,
            actualCostUsd: 0.004,
            latencyMs: 1800,
          },
          provenance: { provider: "openrouter" },
        };
      },
    };
    const runner = new EvaluationRunner(repository, adapter);

    const result = await runner.runJudgeEvaluation({
      rubricKey: "story_quality",
      rubricRevision: 1,
      mode: "blind_ranking",
      judgeModelSlug: "openai/gpt-4.1-mini",
      candidates: [
        {
          sessionId: "session-1",
          runId: "generator-run-a",
          candidateId: "candidate-a",
          payload: { story: "A", generatorModelSlug: "hidden/model-a" },
        },
        {
          sessionId: "session-1",
          runId: "generator-run-b",
          candidateId: "candidate-b",
          payload: { story: "B", generatorModelSlug: "hidden/model-b" },
        },
      ],
    });

    const [captured] = capturedRequests;
    expect(captured).toBeDefined();
    expect(captured?.candidates.map((candidate) => candidate.label)).toEqual([
      "Candidate A",
      "Candidate B",
    ]);
    expect(JSON.stringify(captured)).not.toContain("hidden/model-a");
    expect(JSON.stringify(captured)).not.toContain("hidden/model-b");
    expect(result.execution.usageSnapshot?.actualCostUsd).toBe(0.004);
    expect(result.evaluations).toHaveLength(2);
    expect(
      new Set(
        result.evaluations.map(
          (evaluation) => evaluation.evaluationExecutionId,
        ),
      ),
    ).toEqual(new Set([result.execution.id]));
    expect(
      result.evaluations.map((evaluation) => evaluation.overallScore),
    ).toEqual([8, 6]);
  });
});
