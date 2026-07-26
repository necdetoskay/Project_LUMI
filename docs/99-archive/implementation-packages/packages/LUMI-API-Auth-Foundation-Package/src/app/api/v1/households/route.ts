import { getAuthContext } from "@/api/auth/get-auth-context";
import { createHouseholdRequestSchema } from "@/api/contracts/onboarding";
import { apiErrorResponse } from "@/api/http/errors";
import { requireIdempotencyKey } from "@/api/http/idempotency";
import { parseJson } from "@/api/http/parse-json";
import { createRequestId } from "@/api/http/request-id";
import { apiSuccess } from "@/api/http/respond";
import { createHouseholdService } from "@/application/households/create-household.service";

export async function POST(request: Request) {
  const fallbackRequestId = createRequestId();

  try {
    const context = await getAuthContext();
    const idempotencyKey = await requireIdempotencyKey();
    const payload = await parseJson(
      request,
      createHouseholdRequestSchema,
    );

    const result = await createHouseholdService({
      userId: context.user.id,
      name: payload.name,
      slug: payload.slug,
      idempotencyKey,
    });

    return apiSuccess(
      result.responseBody,
      context.requestId,
      result.responseCode,
    );
  } catch (error) {
    return apiErrorResponse(error, fallbackRequestId);
  }
}
