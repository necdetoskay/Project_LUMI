import { z } from "zod";
import { getAuthContext } from "@/api/auth/get-auth-context";
import { requireWorldAccess } from "@/api/auth/policies";
import { apiErrorResponse } from "@/api/http/errors";
import { parseJson } from "@/api/http/parse-json";
import { createRequestId } from "@/api/http/request-id";
import { apiSuccess } from "@/api/http/respond";
import { withTransaction } from "@/db/transaction";
import { retrieveMemoryContext } from "@/memory/retrieval/retrieve-context.service";

const schema = z.object({
  queryText: z.string().trim().max(1000).optional(),
  subjectIds: z.array(z.string().uuid()).max(20).optional(),
  memoryTypes: z.array(z.string()).max(20).optional(),
  maxResults: z.number().int().min(1).max(50).default(20),
  tokenBudget: z.number().int().min(100).max(12000).default(3000),
});

export async function POST(
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
    const payload = await parseJson(
      request,
      schema,
    );

    const results =
      await withTransaction(
        async (tx) => {
          await requireWorldAccess(
            tx,
            authContext,
            worldId,
          );

          return retrieveMemoryContext(
            tx,
            {
              query: {
                worldId,
                queryText:
                  payload.queryText,
                subjectIds:
                  payload.subjectIds,
                memoryTypes:
                  payload.memoryTypes,
                maxResults:
                  payload.maxResults,
                tokenBudget:
                  payload.tokenBudget,
              },
              purpose: "summary",
              actorUserId:
                authContext.user.id,
            },
          );
        },
      );

    return apiSuccess(
      results,
      authContext.requestId,
    );
  } catch (error) {
    return apiErrorResponse(
      error,
      fallbackRequestId,
    );
  }
}
