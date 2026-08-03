import { NextResponse } from "next/server";
import { z } from "zod";
import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import { getOwnedHousehold } from "@lumi/profiles/application";
import { createManualCheckpoint, getStorySessionOrForbidden } from "@lumi/story/application";
import { observeHandler } from "@/lib/observability/observed-api-route";
import { handleStoryError } from "@/lib/story-api/error";

const paramsSchema = z.object({
  sessionId: z.string().uuid(),
});

const bodySchema = z.object({
  sceneId: z.string().uuid(),
});

export const POST = observeHandler(async (request: Request, { params }: { params: Promise<{ sessionId: string }> }) => {
  return withParent(async (parent) => {
    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get("householdId");
    if (!householdId) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "householdId query parameter is required" },
        { status: 400 },
      );
    }

    const raw = await readRequestBody(request);
    const parsedBody = bodySchema.safeParse(raw);
    const parsedParams = paramsSchema.safeParse(await params);

    if (!parsedBody.success || !parsedParams.success) {
      const issues = [
        ...(parsedBody.success ? [] : [parsedBody.error.message]),
        ...(parsedParams.success ? [] : [parsedParams.error.message]),
      ];
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: issues.join("; ") },
        { status: 400 },
      );
    }

    const { sessionId } = parsedParams.data;
    const { sceneId } = parsedBody.data;

    const household = await getOwnedHousehold(parent.id);
    if (!household || household.id !== householdId) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "User does not have access to this household" },
        { status: 403 },
      );
    }

    try {
      await getStorySessionOrForbidden(sessionId, householdId);
      const checkpoint = await createManualCheckpoint(sessionId, sceneId);
      return NextResponse.json({ checkpoint }, { status: 201 });
    } catch (error) {
      return handleStoryError(error, "Failed to create checkpoint");
    }
  });
}, "/api/stories/sessions/{sessionId}/checkpoints");
