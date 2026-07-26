import { getAuthContext } from "@/api/auth/get-auth-context";
import {
  requireChildAccess,
  requireWorldAccess,
} from "@/api/auth/policies";
import { createStoryRequestSchema } from "@/api/contracts/stories";
import { apiErrorResponse } from "@/api/http/errors";
import { parseJson } from "@/api/http/parse-json";
import { createRequestId } from "@/api/http/request-id";
import { apiSuccess } from "@/api/http/respond";
import { createStoryGenerationRequestService } from "@/application/stories/create-story-generation-request.service";
import { withTransaction } from "@/db/transaction";

export async function POST(request: Request) {
  const fallbackRequestId = createRequestId();

  try {
    const context = await getAuthContext();
    const payload = await parseJson(
      request,
      createStoryRequestSchema,
    );

    await withTransaction(async (tx) => {
      await requireWorldAccess(
        tx,
        context,
        payload.worldId,
      );
      await requireChildAccess(
        tx,
        context,
        payload.childProfileId,
      );
    });

    const result =
      await createStoryGenerationRequestService({
        userId: context.user.id,
        ...payload,
      });

    return apiSuccess(
      result,
      context.requestId,
      202,
    );
  } catch (error) {
    return apiErrorResponse(error, fallbackRequestId);
  }
}
