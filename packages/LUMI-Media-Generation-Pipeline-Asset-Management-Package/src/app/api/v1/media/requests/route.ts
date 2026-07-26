import { z } from "zod";
import { getAuthContext } from "@/api/auth/get-auth-context";
import { apiErrorResponse } from "@/api/http/errors";
import { parseJson } from "@/api/http/parse-json";
import { createRequestId } from "@/api/http/request-id";
import { apiSuccess } from "@/api/http/respond";
import { withTransaction } from "@/db/transaction";
import { createMediaRequest } from "@/media/persistence/create-media-request.service";

const schema = z.object({
  worldId: z.string().uuid(),
  storyId: z.string().uuid().optional(),
  storyNodeId: z.string().uuid().optional(),
  characterId: z.string().uuid().optional(),
  childProfileId: z.string().uuid().optional(),
  mediaType: z.enum(["image", "audio"]),
  purpose: z.string().min(1).max(100),
  promptTemplateCode: z.string().min(1).max(100),
  promptVariables: z.record(z.unknown()),
  estimatedCostTry: z.number().min(0),
  requiresApproval: z.boolean().default(false),
});

export async function POST(
  request: Request,
) {
  const fallbackRequestId =
    createRequestId();

  try {
    const authContext =
      await getAuthContext();

    const payload = await parseJson(
      request,
      schema,
    );

    const mediaRequest =
      await withTransaction(
        async (tx) =>
          createMediaRequest(
            tx,
            payload,
          ),
      );

    return apiSuccess(
      mediaRequest,
      authContext.requestId,
      201,
    );
  } catch (error) {
    return apiErrorResponse(
      error,
      fallbackRequestId,
    );
  }
}
