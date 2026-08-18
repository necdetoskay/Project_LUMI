import type {
  BlindCandidate,
  EvaluationFinding,
  EvaluationMode,
  EvaluationRubric,
  EvaluationUsageSnapshot,
} from "../domain/evaluation";
import type { JsonObject } from "../domain/test-lab-types";

export interface EvaluationJudgeRequest {
  rubric: EvaluationRubric;
  mode: EvaluationMode;
  judgeModelSlug: string;
  candidates: BlindCandidate[];
}

export interface EvaluationJudgeCandidateResult {
  candidateLabel: string;
  findings: EvaluationFinding[];
  rank: number | null;
}

export interface EvaluationJudgeResult {
  judgeId: string;
  judgeModelSlug: string;
  candidates: EvaluationJudgeCandidateResult[];
  usageSnapshot: EvaluationUsageSnapshot | null;
  provenance: JsonObject | null;
}

export interface EvaluationJudgeAdapter {
  evaluate(request: EvaluationJudgeRequest): Promise<EvaluationJudgeResult>;
}
