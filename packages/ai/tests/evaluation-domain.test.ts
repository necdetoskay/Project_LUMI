import { describe, expect, it } from "vitest";

import {
  calculateOverallScore,
  createBlindCandidateSet,
  STORY_QUALITY_RUBRIC_V1,
  summarizeJudgeConsensus,
  type CandidateEvaluation,
  type EvaluationFinding,
} from "../src/test-lab/domain/evaluation";

function findings(score: number): EvaluationFinding[] {
  return STORY_QUALITY_RUBRIC_V1.criteria.map((criterion) => ({
    criterionKey: criterion.key,
    score,
    finding: `${criterion.label} finding`,
    evidence: "Concrete output evidence",
  }));
}

function judge(
  id: string,
  candidateId: string,
  score: number,
): CandidateEvaluation {
  return {
    id: `evaluation-${id}`,
    sessionId: "session-1",
    runId: "run-1",
    candidateId,
    rubricKey: STORY_QUALITY_RUBRIC_V1.key,
    rubricRevision: STORY_QUALITY_RUBRIC_V1.revision,
    mode: "absolute",
    authorType: "judge",
    authorId: id,
    judgeModelSlug: `vendor/${id}`,
    findings: findings(score),
    overallScore: score,
    rank: null,
    usageSnapshot: null,
    provenance: null,
    createdAt: "2026-08-18T13:45:00.000Z",
  };
}

describe("Evaluation domain", () => {
  it("contains the LUMI story-quality criteria required by Phase 6", () => {
    expect(STORY_QUALITY_RUBRIC_V1.criteria.map((item) => item.key)).toEqual([
      "creativity",
      "engagement",
      "curiosity",
      "age_suitability",
      "emotional_resonance",
      "character_fidelity",
      "world_consistency",
      "continuity",
      "pacing",
      "originality",
      "ending",
      "future_story_potential",
    ]);
  });

  it("builds blind candidate labels without generator model identity", () => {
    const blind = createBlindCandidateSet([
      { candidateId: "candidate-a", payload: { story: "A" } },
      { candidateId: "candidate-b", payload: { story: "B" } },
    ]);

    expect(blind).toEqual([
      {
        label: "Candidate A",
        candidateId: "candidate-a",
        payload: { story: "A" },
      },
      {
        label: "Candidate B",
        candidateId: "candidate-b",
        payload: { story: "B" },
      },
    ]);
    expect(JSON.stringify(blind)).not.toContain("modelSlug");
  });

  it("calculates weighted absolute scores from rubric findings", () => {
    expect(calculateOverallScore(STORY_QUALITY_RUBRIC_V1, findings(8))).toBe(8);
    expect(() =>
      calculateOverallScore(STORY_QUALITY_RUBRIC_V1, [
        {
          criterionKey: "creativity",
          score: 11,
          finding: "invalid",
          evidence: null,
        },
      ]),
    ).toThrow("TEST_LAB_EVALUATION_SCORE_OUT_OF_RANGE:creativity:11");
  });

  it("preserves individual judge scores and exposes disagreement variance", () => {
    const summary = summarizeJudgeConsensus("candidate-a", [
      judge("judge-1", "candidate-a", 9),
      judge("judge-2", "candidate-a", 5),
      judge("judge-3", "candidate-b", 10),
    ]);

    expect(summary.judgeCount).toBe(2);
    expect(summary.meanScore).toBe(7);
    expect(summary.minScore).toBe(5);
    expect(summary.maxScore).toBe(9);
    expect(summary.variance).toBe(4);
    expect(summary.scores).toEqual([
      { judgeId: "judge-1", score: 9 },
      { judgeId: "judge-2", score: 5 },
    ]);
  });

  it("keeps human evaluations structurally separate from judge consensus", () => {
    const human: CandidateEvaluation = {
      ...judge("judge-1", "candidate-a", 8),
      id: "evaluation-human",
      authorType: "human",
      authorId: "parent-user",
      judgeModelSlug: null,
    };
    const summary = summarizeJudgeConsensus("candidate-a", [
      judge("judge-1", "candidate-a", 8),
      human,
    ]);

    expect(summary.judgeCount).toBe(1);
    expect(summary.scores).toEqual([{ judgeId: "judge-1", score: 8 }]);
  });
});
