import { desc, eq } from "drizzle-orm";
import { getAuthContext } from "@/api/auth/get-auth-context";
import { requireWorldAccess } from "@/api/auth/policies";
import { apiErrorResponse } from "@/api/http/errors";
import { createRequestId } from "@/api/http/request-id";
import { apiSuccess } from "@/api/http/respond";
import {
  simulationCheckpoints,
  simulationRuns,
} from "@/db/schema";
import { withTransaction } from "@/db/transaction";

export async function GET(
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
    const { worldId } =
      await context.params;

    const result =
      await withTransaction(
        async (tx) => {
          await requireWorldAccess(
            tx,
            authContext,
            worldId,
          );

          const [run] =
            await tx
              .select()
              .from(simulationRuns)
              .where(
                eq(
                  simulationRuns.worldId,
                  worldId,
                ),
              )
              .orderBy(
                desc(
                  simulationRuns.startedAt,
                ),
              )
              .limit(1);

          const [checkpoint] =
            await tx
              .select()
              .from(
                simulationCheckpoints,
              )
              .where(
                eq(
                  simulationCheckpoints.worldId,
                  worldId,
                ),
              )
              .orderBy(
                desc(
                  simulationCheckpoints.simulatedUntil,
                ),
              )
              .limit(1);

          return {
            latestRun: run,
            checkpoint,
          };
        },
      );

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
