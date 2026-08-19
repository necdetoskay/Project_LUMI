import { and, desc, eq, inArray, sql } from "drizzle-orm";

import {
  getAiDb,
  testLabCandidateEvaluations,
  testLabEvaluationExecutions,
  testLabEvaluationRubrics,
  testLabRunCandidates,
  testLabRuns,
  testLabSessions,
  testLabStateSnapshots,
} from "@lumi/ai/db";
import type {
  EvaluationCriterion,
  EvaluationFinding,
  TestRunUsageSnapshot,
} from "@lumi/ai/test-lab";

import {
  buildCanonicalTestLabDashboardData,
  type CanonicalTestLabDashboardData,
} from "./test-lab-dashboard-view-model";

const OWNER_KEY = "__testLabOwner";

export async function loadCanonicalTestLabDashboardData(
  parentId: string,
): Promise<CanonicalTestLabDashboardData> {
  const db = getAiDb();
  const ownerFilter = sql`${testLabStateSnapshots.value} -> ${OWNER_KEY} ->> 'parentId' = ${parentId}`;

  const runs = await db
    .select({
      runId: testLabRuns.id,
      phaseId: testLabRuns.phaseId,
      scenarioKey: testLabSessions.scenarioKey,
      status: testLabRuns.status,
      modelSlug: testLabRuns.modelSlug,
      usageSnapshot: testLabRuns.usageSnapshot,
      createdAt: testLabRuns.createdAt,
    })
    .from(testLabRuns)
    .innerJoin(
      testLabStateSnapshots,
      eq(testLabRuns.parentStateId, testLabStateSnapshots.id),
    )
    .innerJoin(testLabSessions, eq(testLabRuns.sessionId, testLabSessions.id))
    .where(ownerFilter)
    .orderBy(desc(testLabRuns.createdAt))
    .limit(5);

  const runIds = runs.map((run) => run.runId);
  const candidateRows =
    runIds.length === 0
      ? []
      : await db
          .select({ runId: testLabRunCandidates.runId })
          .from(testLabRunCandidates)
          .where(inArray(testLabRunCandidates.runId, runIds));

  const evaluationRows = await db
    .select({
      executionId: testLabEvaluationExecutions.id,
      runId: testLabCandidateEvaluations.runId,
      candidateId: testLabCandidateEvaluations.candidateId,
      overallScore: testLabCandidateEvaluations.overallScore,
      findings: testLabCandidateEvaluations.findings,
      judgeModelSlug: testLabEvaluationExecutions.judgeModelSlug,
      rubricLabel: testLabEvaluationRubrics.label,
      criteria: testLabEvaluationRubrics.criteria,
      createdAt: testLabEvaluationExecutions.createdAt,
    })
    .from(testLabCandidateEvaluations)
    .innerJoin(
      testLabEvaluationExecutions,
      eq(
        testLabCandidateEvaluations.evaluationExecutionId,
        testLabEvaluationExecutions.id,
      ),
    )
    .innerJoin(
      testLabRuns,
      eq(testLabCandidateEvaluations.runId, testLabRuns.id),
    )
    .innerJoin(
      testLabStateSnapshots,
      eq(testLabRuns.parentStateId, testLabStateSnapshots.id),
    )
    .innerJoin(
      testLabEvaluationRubrics,
      and(
        eq(
          testLabEvaluationRubrics.rubricKey,
          testLabCandidateEvaluations.rubricKey,
        ),
        eq(
          testLabEvaluationRubrics.revision,
          testLabCandidateEvaluations.rubricRevision,
        ),
      ),
    )
    .where(
      and(ownerFilter, eq(testLabCandidateEvaluations.authorType, "judge")),
    )
    .orderBy(desc(testLabEvaluationExecutions.createdAt))
    .limit(100);

  const candidateCountByRun = new Map<string, number>();
  for (const row of candidateRows) {
    candidateCountByRun.set(
      row.runId,
      (candidateCountByRun.get(row.runId) ?? 0) + 1,
    );
  }

  return buildCanonicalTestLabDashboardData(
    runs.map((run) => ({
      runId: run.runId,
      phaseId: run.phaseId,
      scenarioKey: run.scenarioKey,
      status: run.status,
      modelSlug: run.modelSlug,
      usageSnapshot: run.usageSnapshot as TestRunUsageSnapshot | null,
      createdAt: run.createdAt.toISOString(),
    })),
    evaluationRows.map((row) => ({
      executionId: row.executionId,
      runId: row.runId,
      candidateId: row.candidateId,
      overallScore: row.overallScore,
      findings: row.findings as EvaluationFinding[],
      judgeModelSlug: row.judgeModelSlug,
      rubricLabel: row.rubricLabel,
      criteria: row.criteria as EvaluationCriterion[],
      createdAt: row.createdAt.toISOString(),
    })),
    [...candidateCountByRun.entries()].map(([runId, count]) => ({
      runId,
      count,
    })),
  );
}
