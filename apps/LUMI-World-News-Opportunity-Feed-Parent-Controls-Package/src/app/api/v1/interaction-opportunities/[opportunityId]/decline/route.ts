import { eq } from "drizzle-orm";
import { getAuthContext } from "@/api/auth/get-auth-context";
import { apiErrorResponse } from "@/api/http/errors";
import { createRequestId } from "@/api/http/request-id";
import { apiSuccess } from "@/api/http/respond";
import {
  interactionOpportunities,
} from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import { recordOpportunityEvent } from "@/opportunities/analytics/record-opportunity-event";

export async function POST(
  _request: Request,
  context: {
    params: Promise<{
      opportunityId: string;
    }>;
  },
) {
  const fallbackRequestId =
    createRequestId();

  try {
    const authContext =
      await getAuthContext();
    const { opportunityId } =
      await context.params;

    await withTransaction(
      async (tx) => {
        await tx
          .update(
            interactionOpportunities,
          )
          .set({
            status: "declined",
            declinedAt: new Date(),
            declinedByUserId:
              authContext.user.id,
          })
          .where(
            eq(
              interactionOpportunities.id,
              opportunityId,
            ),
          );

        await recordOpportunityEvent(
          tx,
          {
            opportunityId,
            householdId:
              authContext.householdId,
            eventType: "declined",
          },
        );
      },
    );

    return apiSuccess(
      {
        opportunityId,
        status: "declined",
      },
      authContext.requestId,
    );
  } catch (error) {
    return apiErrorResponse(
      error,
      fallbackRequestId,
    );
  }
}
