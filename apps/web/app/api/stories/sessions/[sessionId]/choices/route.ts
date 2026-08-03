import { NextResponse } from "next/server";
import { z } from "zod";
import { withParent } from "@/lib/auth/with-parent";
import { getOwnedHousehold } from "@lumi/profiles/application";
import { listChoicePointsByScene, getStorySessionOrForbidden } from "@lumi/story/application";
import { observeHandler } from "@/lib/observability/observed-api-route";
import { handleStoryError } from "@/lib/story-api/error";

const paramsSchema = z.object({
  sessionId: z.string().uuid(),
});

export const GET = observeHandler(async (request: Request, { params }: { params: Promise<{ sessionId: string }> }) => {
  return withParent(async (parent) => {
    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get("householdId");
    const sceneId = searchParams.get("sceneId");

    if (!householdId || !sceneId) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "householdId and sceneId query parameters are required" },
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

    const { sessionId } = parsedParams.data;

    const household = await getOwnedHousehold(parent.id);
    if (!household || household.id !== householdId) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "User does not have access to this household" },
        { status: 403 },
      );
    }

    try {
      await getStorySessionOrForbidden(sessionId, householdId);
      const choicePoints = await listChoicePointsByScene(sceneId);
      return NextResponse.json({ choicePoints });
    } catch (error) {
      return handleStoryError(error, "Failed to list choice points");
    }
  });
}, "/api/stories/sessions/{sessionId}/choices");
