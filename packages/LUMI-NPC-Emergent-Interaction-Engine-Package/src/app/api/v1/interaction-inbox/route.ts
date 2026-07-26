import { and, desc, eq } from "drizzle-orm";
import { getAuthContext } from "@/api/auth/get-auth-context";
import { apiErrorResponse } from "@/api/http/errors";
import { createRequestId } from "@/api/http/request-id";
import { apiSuccess } from "@/api/http/respond";
import {
  interactionInboxItems,
  interactionOpportunities,
} from "@/db/schema";
import { withTransaction } from "@/db/transaction";

export async function GET() {
  const fallbackRequestId =
    createRequestId();

  try {
    const authContext =
      await getAuthContext();

    const items =
      await withTransaction(
        async (tx) =>
          tx
            .select({
              inboxItemId:
                interactionInboxItems.id,
              status:
                interactionInboxItems.status,
              deliveredAt:
                interactionInboxItems.deliveredAt,
              opportunity:
                interactionOpportunities,
            })
            .from(interactionInboxItems)
            .innerJoin(
              interactionOpportunities,
              eq(
                interactionInboxItems.interactionOpportunityId,
                interactionOpportunities.id,
              ),
            )
            .where(
              eq(
                interactionInboxItems.householdId,
                authContext.householdId,
              ),
            )
            .orderBy(
              desc(
                interactionInboxItems.deliveredAt,
              ),
            ),
      );

    return apiSuccess(
      items,
      authContext.requestId,
    );
  } catch (error) {
    return apiErrorResponse(
      error,
      fallbackRequestId,
    );
  }
}
