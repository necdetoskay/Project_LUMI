import type {
  CandidateEvaluation,
  EvaluationExecution,
  EvaluationRubric,
} from "../domain/evaluation";
import type { EvaluationRepository } from "../ports/evaluation-repository";

export class InMemoryEvaluationRepository implements EvaluationRepository {
  private readonly rubrics = new Map<string, EvaluationRubric>();
  private readonly executions = new Map<string, EvaluationExecution>();
  private readonly evaluations = new Map<string, CandidateEvaluation>();

  async saveRubric(rubric: EvaluationRubric): Promise<void> {
    const key = rubricKey(rubric.key, rubric.revision);
    if (this.rubrics.has(key)) {
      throw new Error(`TEST_LAB_EVALUATION_RUBRIC_EXISTS:${key}`);
    }
    this.rubrics.set(key, structuredClone(rubric));
  }

  async getRubric(
    key: string,
    revision: number,
  ): Promise<EvaluationRubric | null> {
    const rubric = this.rubrics.get(rubricKey(key, revision));
    return rubric ? structuredClone(rubric) : null;
  }

  async listRubricRevisions(key: string): Promise<EvaluationRubric[]> {
    return [...this.rubrics.values()]
      .filter((rubric) => rubric.key === key)
      .sort((a, b) => a.revision - b.revision)
      .map((rubric) => structuredClone(rubric));
  }

  async saveExecution(execution: EvaluationExecution): Promise<void> {
    if (this.executions.has(execution.id)) {
      throw new Error(`TEST_LAB_EVALUATION_EXECUTION_EXISTS:${execution.id}`);
    }
    this.executions.set(execution.id, structuredClone(execution));
  }

  async getExecution(id: string): Promise<EvaluationExecution | null> {
    const execution = this.executions.get(id);
    return execution ? structuredClone(execution) : null;
  }

  async saveEvaluation(evaluation: CandidateEvaluation): Promise<void> {
    if (this.evaluations.has(evaluation.id)) {
      throw new Error(`TEST_LAB_EVALUATION_EXISTS:${evaluation.id}`);
    }
    if (!this.executions.has(evaluation.evaluationExecutionId)) {
      throw new Error(
        `TEST_LAB_EVALUATION_EXECUTION_NOT_FOUND:${evaluation.evaluationExecutionId}`,
      );
    }
    this.evaluations.set(evaluation.id, structuredClone(evaluation));
  }

  async listCandidateEvaluations(
    candidateId: string,
  ): Promise<CandidateEvaluation[]> {
    return [...this.evaluations.values()]
      .filter((evaluation) => evaluation.candidateId === candidateId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((evaluation) => structuredClone(evaluation));
  }
}

function rubricKey(key: string, revision: number): string {
  return `${key}@${revision}`;
}
