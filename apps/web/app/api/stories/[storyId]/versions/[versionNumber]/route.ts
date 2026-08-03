import { NextResponse } from "next/server";
import { z } from "zod";
import { withParent } from "@/lib/auth/with-parent";
import { getOwnedHousehold } from "@lumi/profiles/application";
import { getStoryVersionGraphByNumber } from "@lumi/story/application";
import { observeHandler } from "@/lib/observability/observed-api-route";

const paramsSchema = z.object({
  storyId: z.string().uuid(),
  versionNumber: z.coerce.number().int().positive(),
});

function handleStoryError(error: unknown) {
  const err = error as Error & { code?: string };
  const message = err.message ?? "Unknown error";

  if (err.name === "AuthorizationError" || message.includes("not a member")) {
    return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
  }
  if (err.name === "NotFoundError") {
    return NextResponse.json({ error: "NOT_FOUND", message }, { status: 404 });
  }
  if (err.name === "ValidationError") {
    return NextResponse.json({ error: err.code ?? "VALIDATION_ERROR", message }, { status: 400 });
  }
  return NextResponse.json(
    { error: "INTERNAL_ERROR", message: "Story version request failed" },
    { status: 500 },
  );
}

export const GET = observeHandler(async (request: Request, { params }: { params: Promise<{ storyId: string; versionNumber: string }> }) => {
  return withParent(async (parent) => {
    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get("householdId");
    if (!householdId) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "householdId query parameter is required" },
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

    const { storyId, versionNumber } = parsedParams.data;

    const household = await getOwnedHousehold(parent.id);
    if (!household || household.id !== householdId) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "User does not have access to this household" },
        { status: 403 },
      );
    }

    try {
      const graph = await getStoryVersionGraphByNumber(storyId, versionNumber);
      if (graph.definition && graph.definition.householdId !== householdId) {
        return NextResponse.json(
          { error: "NOT_FOUND", message: "Story not found" },
          { status: 404 },
        );
      }

      return NextResponse.json(graph);
    } catch (error) {
      return handleStoryError(error);
    }
  });
}, "/api/stories/{storyId}/versions/{versionNumber}");
