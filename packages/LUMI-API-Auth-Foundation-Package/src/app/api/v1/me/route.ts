import { apiErrorResponse } from "@/api/http/errors";
import { apiSuccess } from "@/api/http/respond";
import { createRequestId } from "@/api/http/request-id";
import { getAuthContext } from "@/api/auth/get-auth-context";

export async function GET() {
  const fallbackRequestId = createRequestId();

  try {
    const context = await getAuthContext();

    return apiSuccess(
      {
        id: context.user.id,
        email: context.user.email,
        roles: context.user.roles,
      },
      context.requestId,
    );
  } catch (error) {
    return apiErrorResponse(error, fallbackRequestId);
  }
}
