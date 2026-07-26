import { getAuthContext } from "@/api/auth/get-auth-context";
import { apiErrorResponse } from "@/api/http/errors";
import { createRequestId } from "@/api/http/request-id";
import { apiSuccess } from "@/api/http/respond";
import { buildParentReport } from "@/reports/build-parent-report";
import { calculateCostMetrics } from "@/analytics/metrics/calculate-cost-metrics";

export async function GET() {
  const fallbackRequestId = createRequestId();

  try {
    const authContext =
      await getAuthContext();

    const report = buildParentReport({
      childName: "Lina",
      summary: {
        childProfileId: "demo",
        storiesCompleted: 8,
        activeStories: 1,
        opportunitiesReceived: 11,
        opportunitiesAccepted: 7,
        unreadFeedItems: 2,
        simulationRuns: 5,
        memoriesCreated: 47,
        totalCostTry: 72.4,
        blockedSafetyReviews: 0,
      },
      opportunityMetrics: {
        received: 11,
        viewed: 10,
        accepted: 7,
        declined: 2,
        snoozed: 1,
        expired: 1,
        storyStarted: 6,
        acceptanceRate: 7 / 11,
        storyConversionRate: 6 / 7,
      },
      costMetrics: calculateCostMetrics({
        estimatedTry: 70,
        actualTry: 72.4,
        textGenerationTry: 20,
        imageGenerationTry: 45,
        audioGenerationTry: 7.4,
      }),
      timeline: [],
    });

    return apiSuccess(
      report,
      authContext.requestId,
    );
  } catch (error) {
    return apiErrorResponse(
      error,
      fallbackRequestId,
    );
  }
}
