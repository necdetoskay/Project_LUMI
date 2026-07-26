import { eq } from "drizzle-orm";
import { z } from "zod";
import { getAuthContext } from "@/api/auth/get-auth-context";
import { apiErrorResponse } from "@/api/http/errors";
import { parseJson } from "@/api/http/parse-json";
import { createRequestId } from "@/api/http/request-id";
import { apiSuccess } from "@/api/http/respond";
import {
  interactionOpportunities,
} from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import { calculateSnoozeUntil } from "@/opportunities/snooze/snooze-opportunity";
import { recordOpportunityEvent } from "@/opportunities/analytics/record-opportunity-event";

const schema = z.object({
  duration: z.enum([
    "later_today",
    "tomorrow",
    "three_days",
  ]),
});

export async function POST(
  request: Request,
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
    const payload = await parseJson(
      request,
      schema,
    );

    const snoozedUntil =
      calculateSnoozeUntil({
        now: new Date(),
        duration: payload.duration,
      });

    await withTransaction(
      async (tx) => {
        await tx
          .update(
            interactionOpportunities,
          )
          .set({
            status: "snoozed",
            snoozedUntil,
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
            eventType: "snoozed",
            metadata: {
              duration:
                payload.duration,
              snoozedUntil:
                snoozedUntil.toISOString(),
            },
          },
        );
      },
    );

    return apiSuccess(
      {
        opportunityId,
        status: "snoozed",
        snoozedUntil,
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
