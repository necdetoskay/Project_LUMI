import { z } from "zod";
import { getAuthContext } from "@/api/auth/get-auth-context";
import { requireWorldAccess } from "@/api/auth/policies";
import { apiErrorResponse } from "@/api/http/errors";
import { createRequestId } from "@/api/http/request-id";
import { apiSuccess } from "@/api/http/respond";
import { withTransaction } from "@/db/transaction";
import { resolveDateRange } from "@/analytics/date-range";
import { getWorldTimeline } from "@/analytics/services/get-world-timeline";

const querySchema = z.object({
  range: z.enum(["7d", "30d", "90d"]).default("30d"),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      worldId: string;
    }>;
  },
) {
  const fallbackRequestId = createRequestId();

  try {
    const authContext =
      await getAuthContext();
    const { worldId } =
      await context.params;
    const url = new URL(request.url);
    const query = querySchema.parse({
      range:
        url.searchParams.get("range") ?? "30d",
      limit:
        url.searchParams.get("limit") ?? "50",
    });

    const range = resolveDateRange({
      preset: query.range,
    });

    const timeline =
      await withTransaction(
        async (tx) => {
          await requireWorldAccess(
            tx,
            authContext,
            worldId,
          );

          return getWorldTimeline(
            tx,
            {
              worldId,
              range,
              limit: query.limit,
            },
          );
        },
      );

    return apiSuccess(
      {
        range,
        timeline,
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
