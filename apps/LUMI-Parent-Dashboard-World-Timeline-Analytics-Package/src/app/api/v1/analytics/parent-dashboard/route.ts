import { z } from "zod";
import { getAuthContext } from "@/api/auth/get-auth-context";
import { apiErrorResponse } from "@/api/http/errors";
import { createRequestId } from "@/api/http/request-id";
import { apiSuccess } from "@/api/http/respond";
import { withTransaction } from "@/db/transaction";
import { resolveDateRange } from "@/analytics/date-range";
import { getParentDashboardSummary } from "@/analytics/services/get-parent-dashboard-summary";
import { getOpportunityMetrics } from "@/analytics/services/get-opportunity-metrics";

const querySchema = z.object({
  childProfileId: z.string().uuid(),
  range: z.enum(["7d", "30d", "90d"]).default("30d"),
});

export async function GET(
  request: Request,
) {
  const fallbackRequestId = createRequestId();

  try {
    const authContext =
      await getAuthContext();
    const url = new URL(request.url);
    const query = querySchema.parse({
      childProfileId:
        url.searchParams.get("childProfileId"),
      range:
        url.searchParams.get("range") ?? "30d",
    });

    const range = resolveDateRange({
      preset: query.range,
    });

    const result =
      await withTransaction(async (tx) => {
        const summary =
          await getParentDashboardSummary(
            tx,
            {
              childProfileId:
                query.childProfileId,
              householdId:
                authContext.householdId,
              range,
            },
          );

        const opportunityMetrics =
          await getOpportunityMetrics(
            tx,
            {
              householdId:
                authContext.householdId,
              childProfileId:
                query.childProfileId,
              range,
            },
          );

        return {
          range,
          summary,
          opportunityMetrics,
        };
      });

    return apiSuccess(
      result,
      authContext.requestId,
    );
  } catch (error) {
    return apiErrorResponse(
      error,
      fallbackRequestId,
    );
  }
}
