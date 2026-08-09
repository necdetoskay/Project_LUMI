import { NextResponse } from "next/server";
import { z } from "zod";

import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import { observeHandler } from "@/lib/observability/observed-api-route";
import { handleStoryError } from "@/lib/story-api/error";
import { generateHookReaderTurn } from "@/lib/story/generated-hook-reader.service";
import { getOwnedHousehold } from "@lumi/profiles/application";
import { getStorySessionOrForbidden } from "@lumi/story/application";

const paramsSchema = z.object({
  sessionId: z.string().uuid(),
});

const bodySchema = z.object({
  hookId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
});

export const POST = observeHandler(
  async (
    request: Request,
    { params }: { params: Promise<{ sessionId: string }> },
  ) => {
    return withParent(async (parent) => {
      const { searchParams } = new URL(request.url);
      const householdId = searchParams.get("householdId");
      if (!householdId) {
        return NextResponse.json(
          {
            error: "VALIDATION_ERROR",
            message: "householdId query parameter is required",
          },
          { status: 400 },
        );
      }

      const parsedParams = paramsSchema.safeParse(await params);
      const parsedBody = bodySchema.safeParse(await readRequestBody(request));
      if (!parsedParams.success || !parsedBody.success) {
        const issues = [
          ...(parsedParams.success ? [] : [parsedParams.error.message]),
          ...(parsedBody.success ? [] : [parsedBody.error.message]),
        ];
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: issues.join("; ") },
          { status: 400 },
        );
      }

      const household = await getOwnedHousehold(parent.id);
      if (!household || household.id !== householdId) {
        return NextResponse.json(
          {
            error: "FORBIDDEN",
            message: "User does not have access to this household",
          },
          { status: 403 },
        );
      }

      const { sessionId } = parsedParams.data;
      try {
        await getStorySessionOrForbidden(sessionId, householdId);
        const result = await generateHookReaderTurn({
          userId: parent.id,
          householdId,
          sessionId,
          hookId: parsedBody.data.hookId,
          expectedVersion: parsedBody.data.expectedVersion,
        });
        return NextResponse.json(result);
      } catch (error) {
        return handleStoryError(error, "Failed to generate story hook scene");
      }
    });
  },
  "/api/stories/sessions/{sessionId}/generated-hook",
);
