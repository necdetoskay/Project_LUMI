import type { JsonObject } from "./test-lab-types";

export type EvaluationTargetType =
  | "character"
  | "world"
  | "npc"
  | "story"
  | "story_arc";

export type EvaluationMode = "absolute" | "blind_ranking";
export type EvaluationAuthorType = "judge" | "human";

export interface EvaluationCriterion {
  key: string;
  label: string;
  description: string;
  weight: number;
  minScore: number;
  maxScore: number;
}

export interface EvaluationRubric {
  key: string;
  revision: number;
  targetType: EvaluationTargetType;
  label: string;
  criteria: EvaluationCriterion[];
  createdAt: string;
}

export interface EvaluationFinding {
  criterionKey: string;
  score: number;
  finding: string;
  evidence: string | null;
}

export interface EvaluationUsageSnapshot {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  actualCostUsd: number | null;
  latencyMs: number;
}

export interface EvaluationExecution {
  id: string;
  sessionId: string;
  rubricKey: string;
  rubricRevision: number;
  mode: EvaluationMode;
  authorType: EvaluationAuthorType;
  authorId: string;
  judgeModelSlug: string | null;
  usageSnapshot: EvaluationUsageSnapshot | null;
  provenance: JsonObject | null;
  createdAt: string;
}

export interface CandidateEvaluation {
  id: string;
  evaluationExecutionId: string;
  sessionId: string;
  runId: string;
  candidateId: string;
  rubricKey: string;
  rubricRevision: number;
  mode: EvaluationMode;
  authorType: EvaluationAuthorType;
  authorId: string;
  judgeModelSlug: string | null;
  findings: EvaluationFinding[];
  overallScore: number;
  rank: number | null;
  createdAt: string;
}

export interface BlindCandidate {
  label: string;
  candidateId: string;
  payload: JsonObject;
}

export interface JudgeConsensus {
  candidateId: string;
  judgeCount: number;
  meanScore: number;
  minScore: number;
  maxScore: number;
  variance: number;
  scores: Array<{ judgeId: string; score: number }>;
}

export const STORY_QUALITY_RUBRIC_V1: EvaluationRubric = {
  key: "story_quality",
  revision: 1,
  targetType: "story",
  label: "LUMI Story Quality v1",
  createdAt: "2026-08-18T00:00:00.000Z",
  criteria: [
    criterion("creativity", "Creativity", "Fresh and imaginative story ideas."),
    criterion(
      "engagement",
      "Engagement",
      "Keeps the child interested in the story.",
    ),
    criterion(
      "curiosity",
      "Curiosity",
      "Creates questions and desire to discover what happens next.",
    ),
    criterion(
      "age_suitability",
      "Age suitability",
      "Language, themes and complexity fit the child age.",
    ),
    criterion(
      "emotional_resonance",
      "Emotional resonance",
      "Creates understandable and meaningful emotional beats.",
    ),
    criterion(
      "character_fidelity",
      "Character fidelity",
      "Character voice, goals and established traits remain consistent.",
    ),
    criterion(
      "world_consistency",
      "World consistency",
      "World facts and rules are respected.",
    ),
    criterion(
      "continuity",
      "Continuity",
      "Prior selected events, state and unresolved threads are handled consistently.",
    ),
    criterion(
      "pacing",
      "Pacing",
      "Story progression is neither rushed nor stagnant.",
    ),
    criterion(
      "originality",
      "Originality",
      "Avoids repetitive or generic scene construction.",
    ),
    criterion(
      "ending",
      "Ending",
      "The scene or story closes in a satisfying way for its intended scope.",
    ),
    criterion(
      "future_story_potential",
      "Future-story potential",
      "Leaves meaningful possibilities for later stories without forcing a cliffhanger.",
    ),
  ],
};

export function createBlindCandidateSet(
  candidates: Array<{ candidateId: string; payload: JsonObject }>,
): BlindCandidate[] {
  return candidates.map((candidate, index) => ({
    label: candidateLabel(index),
    candidateId: candidate.candidateId,
    payload: structuredClone(candidate.payload),
  }));
}

export function calculateOverallScore(
  rubric: EvaluationRubric,
  findings: EvaluationFinding[],
): number {
  const byCriterion = new Map(
    findings.map((finding) => [finding.criterionKey, finding]),
  );
  let weighted = 0;
  let totalWeight = 0;
  for (const criterion of rubric.criteria) {
    const finding = byCriterion.get(criterion.key);
    if (!finding) continue;
    assertScoreInRange(criterion, finding.score);
    weighted += finding.score * criterion.weight;
    totalWeight += criterion.weight;
  }
  if (totalWeight === 0) return 0;
  return weighted / totalWeight;
}

export function summarizeJudgeConsensus(
  candidateId: string,
  evaluations: CandidateEvaluation[],
): JudgeConsensus {
  const scores = evaluations
    .filter(
      (evaluation) =>
        evaluation.authorType === "judge" &&
        evaluation.candidateId === candidateId,
    )
    .map((evaluation) => ({
      judgeId: evaluation.authorId,
      score: evaluation.overallScore,
    }));
  if (scores.length === 0) {
    return {
      candidateId,
      judgeCount: 0,
      meanScore: 0,
      minScore: 0,
      maxScore: 0,
      variance: 0,
      scores: [],
    };
  }
  const meanScore =
    scores.reduce((sum, item) => sum + item.score, 0) / scores.length;
  const variance =
    scores.reduce((sum, item) => sum + (item.score - meanScore) ** 2, 0) /
    scores.length;
  return {
    candidateId,
    judgeCount: scores.length,
    meanScore,
    minScore: Math.min(...scores.map((item) => item.score)),
    maxScore: Math.max(...scores.map((item) => item.score)),
    variance,
    scores,
  };
}

function criterion(
  key: string,
  label: string,
  description: string,
): EvaluationCriterion {
  return { key, label, description, weight: 1, minScore: 1, maxScore: 10 };
}

function candidateLabel(index: number): string {
  let value = index;
  let label = "";
  do {
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);
  return `Candidate ${label}`;
}

function assertScoreInRange(
  criterion: EvaluationCriterion,
  score: number,
): void {
  if (score < criterion.minScore || score > criterion.maxScore) {
    throw new Error(
      `TEST_LAB_EVALUATION_SCORE_OUT_OF_RANGE:${criterion.key}:${score}`,
    );
  }
}
