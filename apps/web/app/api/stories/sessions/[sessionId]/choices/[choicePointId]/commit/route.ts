import { NextResponse } from "next/server";
import { z } from "zod";
import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import { getOwnedHousehold } from "@lumi/profiles/application";
import {
  commitChoice,
  commitPersistedChoiceConsequence,
  getChoicePointWithOptions,
  getStorySessionOrForbidden,
} from "@lumi/story/application";
import { observeHandler } from "@/lib/observability/observed-api-route";
import { handleStoryError } from "@/lib/story-api/error";

const paramsSchema = z.object({
  sessionId: z.string().uuid(),
  choicePointId: z.string().uuid(),
});

const bodySchema = z.object({
  optionId: z.string().uuid(),
  evidenceSceneId: z.string().uuid(),
  idempotencyKey: z.string().min(1).optional(),
  commitWorldConsequence: z.boolean().optional(),
});

function hasDurableWorldPreview(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const consequenceType = (entry as { consequenceType?: unknown })
      .consequenceType;
    return consequenceType === "flag_set" || consequenceType === "flag_remove";
  });
}

export const POST = observeHandler(
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

      const { sessionId, choicePointId } = parsedParams.data;
      const {
        optionId,
        evidenceSceneId,
        idempotencyKey,
        commitWorldConsequence,
      } = parsedBody.data;

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
        const session = await getStorySessionOrForbidden(sessionId, householdId);
        const choicePoint = await getChoicePointWithOptions(choicePointId);
        const selectedOption = choicePoint.options.find(
          (option) => option.id === optionId,
        );
        const shouldCommitWorldConsequence =
          commitWorldConsequence ??
          hasDurableWorldPreview(selectedOption?.consequencePreviews);

        const result = await commitChoice({
          storySessionId: sessionId,
          choicePointId,
          optionId,
          evidenceSceneId,
          idempotencyKey,
          actorUserId: parent.id,
        });

        const committedChoice =
          "committedChoice" in result ? result.committedChoice : result;
        const worldConsequence = shouldCommitWorldConsequence
          ? await commitPersistedChoiceConsequence({
              storySessionId: sessionId,
              committedChoiceId: committedChoice.id,
              householdId,
              worldId: session.worldId,
            })
          : null;

        return NextResponse.json(
          {
            ...("committedChoice" in result
              ? result
              : { committedChoice: result }),
            worldConsequence,
          },
          { status: 201 },
        );
      } catch (error) {
        return handleStoryError(error, "Failed to commit choice");
      }
    });
  },
  "/api/stories/sessions/{sessionId}/choices/{choicePointId}/commit",
);
