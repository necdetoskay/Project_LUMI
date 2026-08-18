import type {
  CandidateEvaluation,
  EvaluationExecution,
  EvaluationRubric,
} from "../domain/evaluation";

export interface EvaluationRepository {
  saveRubric(rubric: EvaluationRubric): Promise<void>;
  getRubric(key: string, revision: number): Promise<EvaluationRubric | null>;
  listRubricRevisions(key: string): Promise<EvaluationRubric[]>;
  saveExecution(execution: EvaluationExecution): Promise<void>;
  getExecution(id: string): Promise<EvaluationExecution | null>;
  saveEvaluation(evaluation: CandidateEvaluation): Promise<void>;
  listCandidateEvaluations(candidateId: string): Promise<CandidateEvaluation[]>;
}
