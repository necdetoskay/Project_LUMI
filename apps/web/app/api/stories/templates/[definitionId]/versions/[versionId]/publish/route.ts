import { NextResponse } from "next/server";
import { z } from "zod";

import { withParent } from "@/lib/auth/with-parent";
import { observeHandler } from "@/lib/observability/observed-api-route";
import { handleStoryError } from "@/lib/story-api/error";
import { getOwnedHousehold } from "@lumi/profiles/application";
import { publishStoryTemplateRevision } from "@lumi/story/application";

const paramsSchema = z.object({
  definitionId: z.string().uuid(),
  versionId: z.string().uuid(),
});

export const POST = observeHandler(
  async (
    request: Request,
    {
      params,
    }: {
      params: Promise<{ definitionId: string; versionId: string }>;
    },
  ) =>
    withParent(async (parent) => {
      const householdId = new URL(request.url).searchParams.get("householdId");
      if (!householdId) {
        return NextResponse.json(
          {
            error: "VALIDATION_ERROR",
            message: "householdId query parameter is required",
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
      const parsed = paramsSchema.safeParse(await params);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: parsed.error.message },
          { status: 400 },
        );
      }
      try {
        return NextResponse.json(
          await publishStoryTemplateRevision({
            householdId,
            storyDefinitionId: parsed.data.definitionId,
            storyVersionId: parsed.data.versionId,
          }),
        );
      } catch (error) {
        return handleStoryError(
          error,
          "Failed to publish story template revision",
        );
      }
    }),
  "/api/stories/templates/{definitionId}/versions/{versionId}/publish",
);
