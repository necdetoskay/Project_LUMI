import { eq } from "drizzle-orm";
import { getAuthContext } from "@/api/auth/get-auth-context";
import { apiErrorResponse } from "@/api/http/errors";
import { createRequestId } from "@/api/http/request-id";
import { apiSuccess } from "@/api/http/respond";
import {
  generationRequests,
} from "@/db/schema";
import { withTransaction } from "@/db/transaction";

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      requestId: string;
    }>;
  },
) {
  const fallbackRequestId = createRequestId();

  try {
    const authContext =
      await getAuthContext();
    const { requestId } =
      await context.params;

    const [record] =
      await withTransaction(
        async (tx) =>
          tx
            .select({
              id: generationRequests.id,
              status:
                generationRequests.status,
              outputPayload:
                generationRequests.outputPayload,
              completedAt:
                generationRequests.completedAt,
            })
            .from(generationRequests)
            .where(
              eq(
                generationRequests.id,
                requestId,
              ),
            )
            .limit(1),
      );

    if (!record) {
      const error = new Error(
        "Generation request not found",
      ) as Error & {
        code: string;
        status: number;
      };
      error.code =
        "GENERATION_REQUEST_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    return apiSuccess(
      record,
      authContext.requestId,
    );
  } catch (error) {
    return apiErrorResponse(
      error,
      fallbackRequestId,
    );
  }
}
