import { NextResponse } from "next/server";
import { z } from "zod";

import { withParent } from "@/lib/auth/with-parent";
import { observeHandler } from "@/lib/observability/observed-api-route";
import { handleStoryError } from "@/lib/story-api/error";
import { getOwnedHousehold } from "@lumi/profiles/application";
import {
  getGenerationInspection,
  getStorySessionOrForbidden,
} from "@lumi/story/application";

const paramsSchema = z.object({
  sessionId: z.string().uuid(),
  sceneId: z.string().uuid(),
});

export const GET = observeHandler(
  async (
    request: Request,
    {
      params,
    }: { params: Promise<{ sessionId: string; sceneId: string }> },
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
      if (!parsedParams.success) {
        return NextResponse.json(
          {
            error: "VALIDATION_ERROR",
            message: parsedParams.error.message,
          },
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

      const { sessionId, sceneId } = parsedParams.data;
      try {
        await getStorySessionOrForbidden(sessionId, householdId);
        const inspection = await getGenerationInspection({
          householdId,
          storySessionId: sessionId,
          generatedSceneId: sceneId,
        });
        return NextResponse.json({ inspection });
      } catch (error) {
        return handleStoryError(
          error,
          "Failed to load generation context inspection",
        );
      }
    });
  },
  "/api/settings/context-inspector/sessions/{sessionId}/scenes/{sceneId}",
);
