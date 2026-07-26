import { getAuthContext } from "@/api/auth/get-auth-context";
import { requireHouseholdAccess } from "@/api/auth/policies";
import { createChildRequestSchema } from "@/api/contracts/onboarding";
import { apiErrorResponse } from "@/api/http/errors";
import { parseJson } from "@/api/http/parse-json";
import { createRequestId } from "@/api/http/request-id";
import { apiSuccess } from "@/api/http/respond";
import { DrizzleChildProfileRepository } from "@/db/repositories/profile/drizzle-child-profile.repository";
import { withTransaction } from "@/db/transaction";

export async function POST(
  request: Request,
  context: { params: Promise<{ householdId: string }> },
) {
  const fallbackRequestId = createRequestId();

  try {
    const authContext = await getAuthContext();
    const { householdId } = await context.params;
    const payload = await parseJson(
      request,
      createChildRequestSchema,
    );

    const child = await withTransaction(async (tx) => {
      await requireHouseholdAccess(
        tx,
        authContext,
        householdId,
      );

      return new DrizzleChildProfileRepository(tx).create({
        householdId,
        name: payload.name,
        birthYear: payload.birthYear,
      });
    });

    return apiSuccess(
      child,
      authContext.requestId,
      201,
    );
  } catch (error) {
    return apiErrorResponse(error, fallbackRequestId);
  }
}
