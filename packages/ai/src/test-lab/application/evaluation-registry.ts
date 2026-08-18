import type { EvaluationRubric } from "../domain/evaluation";
import type { EvaluationRepository } from "../ports/evaluation-repository";

export class EvaluationRegistry {
  constructor(private readonly repository: EvaluationRepository) {}

  async register(rubric: EvaluationRubric): Promise<void> {
    if (rubric.revision <= 0 || !Number.isInteger(rubric.revision)) {
      throw new Error("TEST_LAB_EVALUATION_INVALID_RUBRIC_REVISION");
    }
    if (rubric.criteria.length === 0) {
      throw new Error("TEST_LAB_EVALUATION_EMPTY_RUBRIC");
    }
    await this.repository.saveRubric(rubric);
  }

  async resolve(key: string, revision: number): Promise<EvaluationRubric> {
    const rubric = await this.repository.getRubric(key, revision);
    if (!rubric) {
      throw new Error(`TEST_LAB_EVALUATION_RUBRIC_NOT_FOUND:${key}@${revision}`);
    }
    return rubric;
  }

  async resolveLatest(key: string): Promise<EvaluationRubric> {
    const revisions = await this.repository.listRubricRevisions(key);
    const rubric = revisions.at(-1);
    if (!rubric) {
      throw new Error(`TEST_LAB_EVALUATION_RUBRIC_NOT_FOUND:${key}`);
    }
    return rubric;
  }
}
