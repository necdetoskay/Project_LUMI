import { getAuthContext } from "@/api/auth/get-auth-context";
import { requireWorldAccess } from "@/api/auth/policies";
import { requireIdempotencyKey } from "@/api/http/idempotency";
import { apiErrorResponse } from "@/api/http/errors";
import { createRequestId } from "@/api/http/request-id";
import { apiSuccess } from "@/api/http/respond";
import { scheduleWorldSimulation } from "@/simulation/scheduler/schedule-world-simulation";
import { withTransaction } from "@/db/transaction";

export async function POST(
  _request: Request,
  context: {
    params: Promise<{
      worldId: string;
    }>;
  },
) {
  const fallbackRequestId =
    createRequestId();

  try {
    const authContext =
      await getAuthContext();
    await requireIdempotencyKey();
    const { worldId } =
      await context.params;

    const job =
      await withTransaction(
        async (tx) => {
          await requireWorldAccess(
            tx,
            authContext,
            worldId,
          );

          return scheduleWorldSimulation(
            tx,
            {
              worldId,
              runAt:
                new Date(),
              reason: "manual",
            },
          );
        },
      );

    return apiSuccess(
      {
        jobId: job?.id,
        status: "scheduled",
      },
      authContext.requestId,
      202,
    );
  } catch (error) {
    return apiErrorResponse(
      error,
      fallbackRequestId,
    );
  }
}
