import { describe, expect, it } from "vitest";

import {
  InMemoryEvaluationRepository,
  STORY_QUALITY_RUBRIC_V1,
} from "../src/test-lab";
import type { CandidateEvaluation } from "../src/test-lab";

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

    await expect(repository.saveRubric(STORY_QUALITY_RUBRIC_V1)).rejects.toThrow(
      "TEST_LAB_EVALUATION_RUBRIC_EXISTS:story_quality@1",
    );
    expect(
      (await repository.listRubricRevisions("story_quality")).map(
        (rubric) => rubric.revision,
      ),
    ).toEqual([1, 2]);
  });

  it("keeps judge and human evaluations separate for the same candidate", async () => {
    const repository = new InMemoryEvaluationRepository();
    const judge = evaluation({
      id: "eval-judge",
      authorType: "judge",
      authorId: "judge-a",
      judgeModelSlug: "openai/gpt-4.1-mini",
      overallScore: 8.4,
    });
    const human = evaluation({
      id: "eval-human",
      authorType: "human",
      authorId: "parent-1",
      judgeModelSlug: null,
      overallScore: 9,
    });

    await repository.saveEvaluation(judge);
    await repository.saveEvaluation(human);

    const stored = await repository.listCandidateEvaluations("candidate-1");
    expect(stored).toHaveLength(2);
    expect(stored.find((item) => item.authorType === "judge")?.judgeModelSlug).toBe(
      "openai/gpt-4.1-mini",
    );
    expect(stored.find((item) => item.authorType === "human")?.judgeModelSlug).toBeNull();
  });
});

function evaluation(
  overrides: Partial<CandidateEvaluation>,
): CandidateEvaluation {
  return {
    id: "eval-1",
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
    usageSnapshot: null,
    provenance: null,
    createdAt: "2026-08-18T00:00:00.000Z",
    ...overrides,
  };
}
