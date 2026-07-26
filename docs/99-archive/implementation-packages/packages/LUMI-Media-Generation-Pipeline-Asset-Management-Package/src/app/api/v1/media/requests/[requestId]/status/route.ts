import { eq } from "drizzle-orm";
import { getAuthContext } from "@/api/auth/get-auth-context";
import { apiErrorResponse } from "@/api/http/errors";
import { createRequestId } from "@/api/http/request-id";
import { apiSuccess } from "@/api/http/respond";
import {
  mediaAssets,
  mediaRequests,
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
  const fallbackRequestId =
    createRequestId();

  try {
    const authContext =
      await getAuthContext();
    const { requestId } =
      await context.params;

    const result =
      await withTransaction(
        async (tx) => {
          const [request] =
            await tx
              .select()
              .from(mediaRequests)
              .where(
                eq(
                  mediaRequests.id,
                  requestId,
                ),
              )
              .limit(1);

          const [asset] =
            await tx
              .select()
              .from(mediaAssets)
              .where(
                eq(
                  mediaAssets.mediaRequestId,
                  requestId,
                ),
              )
              .limit(1);

          return {
            request,
            asset,
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
