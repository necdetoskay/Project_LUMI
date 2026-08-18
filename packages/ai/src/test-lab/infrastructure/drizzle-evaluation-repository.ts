import { and, eq } from "drizzle-orm";

import type { Database } from "../../db/client";
import {
  testLabCandidateEvaluations,
  testLabEvaluationExecutions,
  testLabEvaluationRubrics,
} from "../../db/schema/ai";
import type {
  CandidateEvaluation,
  EvaluationCriterion,
  EvaluationExecution,
  EvaluationFinding,
  EvaluationRubric,
  EvaluationUsageSnapshot,
} from "../domain/evaluation";
import type { JsonObject } from "../domain/test-lab-types";
import type { EvaluationRepository } from "../ports/evaluation-repository";

export class DrizzleEvaluationRepository implements EvaluationRepository {
  constructor(private readonly db: Database) {}

  async saveRubric(rubric: EvaluationRubric): Promise<void> {
    await this.db.insert(testLabEvaluationRubrics).values({
      rubricKey: rubric.key,
      revision: rubric.revision,
      targetType: rubric.targetType,
      label: rubric.label,
      criteria: rubric.criteria,
      createdAt: new Date(rubric.createdAt),
    });
  }

  async getRubric(
    key: string,
    revision: number,
  ): Promise<EvaluationRubric | null> {
    const [row] = await this.db
      .select()
      .from(testLabEvaluationRubrics)
      .where(
        and(
          eq(testLabEvaluationRubrics.rubricKey, key),
          eq(testLabEvaluationRubrics.revision, revision),
        ),
      )
      .limit(1);
    return row ? this.mapRubric(row) : null;
  }

  async listRubricRevisions(key: string): Promise<EvaluationRubric[]> {
    const rows = await this.db
      .select()
      .from(testLabEvaluationRubrics)
      .where(eq(testLabEvaluationRubrics.rubricKey, key));
    return rows
      .map((row) => this.mapRubric(row))
      .sort((a, b) => a.revision - b.revision);
  }

  async saveExecution(execution: EvaluationExecution): Promise<void> {
    await this.db.insert(testLabEvaluationExecutions).values({
      id: execution.id,
      sessionId: execution.sessionId,
      rubricKey: execution.rubricKey,
      rubricRevision: execution.rubricRevision,
      mode: execution.mode,
      authorType: execution.authorType,
      authorId: execution.authorId,
      judgeModelSlug: execution.judgeModelSlug,
      usageSnapshot: execution.usageSnapshot,
      provenance: execution.provenance,
      createdAt: new Date(execution.createdAt),
    });
  }

  async getExecution(id: string): Promise<EvaluationExecution | null> {
    const [row] = await this.db
      .select()
      .from(testLabEvaluationExecutions)
      .where(eq(testLabEvaluationExecutions.id, id))
      .limit(1);
    return row ? this.mapExecution(row) : null;
  }

  async saveEvaluation(evaluation: CandidateEvaluation): Promise<void> {
    await this.db.insert(testLabCandidateEvaluations).values({
      id: evaluation.id,
      evaluationExecutionId: evaluation.evaluationExecutionId,
      sessionId: evaluation.sessionId,
      runId: evaluation.runId,
      candidateId: evaluation.candidateId,
      rubricKey: evaluation.rubricKey,
      rubricRevision: evaluation.rubricRevision,
      mode: evaluation.mode,
      authorType: evaluation.authorType,
      authorId: evaluation.authorId,
      judgeModelSlug: evaluation.judgeModelSlug,
      findings: evaluation.findings,
      overallScore: evaluation.overallScore,
      rank: evaluation.rank,
      createdAt: new Date(evaluation.createdAt),
    });
  }

  async listCandidateEvaluations(
    candidateId: string,
  ): Promise<CandidateEvaluation[]> {
    const rows = await this.db
      .select()
      .from(testLabCandidateEvaluations)
      .where(eq(testLabCandidateEvaluations.candidateId, candidateId));
    return rows
      .map((row) => this.mapEvaluation(row))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  private mapRubric(
    row: typeof testLabEvaluationRubrics.$inferSelect,
  ): EvaluationRubric {
    return {
      key: row.rubricKey,
      revision: row.revision,
      targetType: row.targetType as EvaluationRubric["targetType"],
      label: row.label,
      criteria: row.criteria as EvaluationCriterion[],
      createdAt: row.createdAt.toISOString(),
    };
  }

  private mapExecution(
    row: typeof testLabEvaluationExecutions.$inferSelect,
  ): EvaluationExecution {
    return {
      id: row.id,
      sessionId: row.sessionId,
      rubricKey: row.rubricKey,
      rubricRevision: row.rubricRevision,
      mode: row.mode as EvaluationExecution["mode"],
      authorType: row.authorType as EvaluationExecution["authorType"],
      authorId: row.authorId,
      judgeModelSlug: row.judgeModelSlug,
      usageSnapshot: row.usageSnapshot as EvaluationUsageSnapshot | null,
      provenance: row.provenance as JsonObject | null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private mapEvaluation(
    row: typeof testLabCandidateEvaluations.$inferSelect,
  ): CandidateEvaluation {
    return {
      id: row.id,
      evaluationExecutionId: row.evaluationExecutionId,
      sessionId: row.sessionId,
      runId: row.runId,
      candidateId: row.candidateId,
      rubricKey: row.rubricKey,
      rubricRevision: row.rubricRevision,
      mode: row.mode as CandidateEvaluation["mode"],
      authorType: row.authorType as CandidateEvaluation["authorType"],
      authorId: row.authorId,
      judgeModelSlug: row.judgeModelSlug,
      findings: row.findings as EvaluationFinding[],
      overallScore: row.overallScore,
      rank: row.rank,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
