import { desc, eq, sql } from "drizzle-orm";

import {
  getAiDb,
  testLabRuns,
  testLabSessions,
  testLabStateSnapshots,
} from "@lumi/ai/db";
import type { TestRunUsageSnapshot } from "@lumi/ai/test-lab";

import {
  buildCanonicalTestLabDashboardData,
  type CanonicalTestLabDashboardData,
} from "./test-lab-dashboard-view-model";

const OWNER_KEY = "__testLabOwner";

export async function loadCanonicalTestLabDashboardData(
  parentId: string,
): Promise<CanonicalTestLabDashboardData> {
  const rows = await getAiDb()
    .select({
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
    .where(
      sql`${testLabStateSnapshots.value} -> ${OWNER_KEY} ->> 'parentId' = ${parentId}`,
    )
    .orderBy(desc(testLabRuns.createdAt))
    .limit(5);

  return buildCanonicalTestLabDashboardData(
    rows.map((row) => ({
      phaseId: row.phaseId,
      scenarioKey: row.scenarioKey,
      status: row.status,
      modelSlug: row.modelSlug,
      usageSnapshot: row.usageSnapshot as TestRunUsageSnapshot | null,
      createdAt: row.createdAt.toISOString(),
    })),
  );
}
