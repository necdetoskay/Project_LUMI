import { NextResponse } from "next/server";
import { z } from "zod";
import { withParent } from "@/lib/auth/with-parent";
import { getOwnedHousehold } from "@lumi/profiles/application";
import {
  evaluateChoicePointAvailability,
  getStorySessionOrForbidden,
} from "@lumi/story/application";
import { observeHandler } from "@/lib/observability/observed-api-route";
import { handleStoryError } from "@/lib/story-api/error";

const paramsSchema = z.object({
  sessionId: z.string().uuid(),
  choicePointId: z.string().uuid(),
});

export const GET = observeHandler(
  async (
    request: Request,
    {
      params,
    }: { params: Promise<{ sessionId: string; choicePointId: string }> },
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
          { error: "VALIDATION_ERROR", message: parsedParams.error.message },
          { status: 400 },
        );
      }

      const { sessionId, choicePointId } = parsedParams.data;

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

      try {
        const session = await getStorySessionOrForbidden(
          sessionId,
          householdId,
        );
        const result = await evaluateChoicePointAvailability(
          sessionId,
          choicePointId,
          session.currentSceneId ?? "",
          session.storyVersionId,
          await hashSessionContext(session),
        );
        return NextResponse.json(result);
      } catch (error) {
        return handleStoryError(
          error,
          "Failed to evaluate choice point availability",
        );
      }
    });
  },
  "/api/stories/sessions/{sessionId}/choices/{choicePointId}",
);

async function hashSessionContext(session: {
  id: string;
  currentSceneId: string | null;
  sessionStatus: string;
  version: number;
  contextSnapshot: unknown;
}): Promise<string> {
  const { hashObject } = await import("@lumi/story/application");
  return hashObject({
    sessionId: session.id,
    sceneId: session.currentSceneId,
    status: session.sessionStatus,
    version: session.version,
    snapshot: session.contextSnapshot,
  });
}
