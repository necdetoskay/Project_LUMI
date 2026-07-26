import { getAuthContext } from "@/api/auth/get-auth-context";
import { recordDecisionRequestSchema } from "@/api/contracts/stories";
import { apiErrorResponse } from "@/api/http/errors";
import { parseJson } from "@/api/http/parse-json";
import { createRequestId } from "@/api/http/request-id";
import { apiSuccess } from "@/api/http/respond";
import { recordStoryDecisionService } from "@/application/stories/record-story-decision.service";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const fallbackRequestId = createRequestId();

  try {
    const authContext = await getAuthContext();
    const { sessionId } = await context.params;
    const payload = await parseJson(
      request,
      recordDecisionRequestSchema,
    );

    const decision =
      await recordStoryDecisionService({
        userId: authContext.user.id,
        sessionId,
        ...payload,
      });

    return apiSuccess(
      decision,
      authContext.requestId,
      201,
    );
  } catch (error) {
    return apiErrorResponse(error, fallbackRequestId);
  }
}
