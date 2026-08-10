import { NextResponse } from "next/server";
import { z } from "zod";
import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import { getOwnedHousehold } from "@lumi/profiles/application";
import {
  commitChoice,
  commitPersistedChoiceConsequence,
  getChoicePointWithOptions,
  getSessionPlaybackState,
  getStorySessionOrForbidden,
  getStoryVersionGraph,
} from "@lumi/story/application";
import {
  getCharacterCurrentLocation,
  getWorldDetail,
  moveCharacterToLocation,
} from "@lumi/world/application";
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

function previews(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is Record<string, unknown> =>
          Boolean(entry) && typeof entry === "object" && !Array.isArray(entry),
      )
    : [];
}

function hasDurableWorldPreview(value: unknown): boolean {
  return previews(value).some((entry) => {
    const consequenceType = entry.consequenceType;
    return consequenceType === "flag_set" || consequenceType === "flag_remove";
  });
}

function getSceneTransitionTarget(value: unknown): string | null {
  for (const entry of previews(value)) {
    if (
      entry.consequenceType === "scene_transition" &&
      typeof entry.targetKey === "string" &&
      entry.targetKey.length > 0
    ) {
      return entry.targetKey;
    }
  }
  return null;
}

async function syncCharacterLocationToTargetScene(input: {
  storyVersionId: string;
  targetSceneKeyOrId: string | null;
  worldId: string;
  householdId: string;
  sessionId: string;
}) {
  if (!input.targetSceneKeyOrId) return null;

  const [graph, playback, worldDetail] = await Promise.all([
    getStoryVersionGraph(input.storyVersionId),
    getSessionPlaybackState(input.sessionId),
    getWorldDetail(input.worldId),
  ]);

  const targetScene = graph.scenes.find(
    (scene) =>
      scene.id === input.targetSceneKeyOrId ||
      scene.sceneKey === input.targetSceneKeyOrId,
  );
  if (!targetScene) return null;

  const metadata =
    targetScene.metadata && typeof targetScene.metadata === "object"
      ? (targetScene.metadata as Record<string, unknown>)
      : {};
  const locationKey =
    typeof metadata.locationKey === "string" ? metadata.locationKey : null;
  if (!locationKey) return null;

  const targetLocation = worldDetail.locations.find(
    (location) => location.locationKey === locationKey,
  );
  if (!targetLocation) return null;

  const protagonist = playback.characters.find(
    (entry) => entry.participationRole === "protagonist",
  );
  if (!protagonist) return null;

  const currentLocation = await getCharacterCurrentLocation(
    protagonist.characterId,
  );
  if (currentLocation?.id === targetLocation.id) {
    return {
      outcome: "already_at_target" as const,
      characterId: protagonist.characterId,
      locationId: targetLocation.id,
      locationKey,
    };
  }

  const movement = await moveCharacterToLocation({
    characterId: protagonist.characterId,
    targetLocationId: targetLocation.id,
    householdId: input.householdId,
    worldId: input.worldId,
  });

  return {
    outcome: "moved" as const,
    characterId: protagonist.characterId,
    locationId: targetLocation.id,
    locationKey,
    movement,
  };
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
        const session = await getStorySessionOrForbidden(
          sessionId,
          householdId,
        );
        const choicePoint = await getChoicePointWithOptions(choicePointId);
        const selectedOption = choicePoint.options.find(
          (option) => option.id === optionId,
        );
        const consequencePreviews = selectedOption?.consequencePreviews;
        const shouldCommitWorldConsequence =
          commitWorldConsequence ?? hasDurableWorldPreview(consequencePreviews);
        const targetSceneKeyOrId =
          getSceneTransitionTarget(consequencePreviews);

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

        const locationSync = await syncCharacterLocationToTargetScene({
          storyVersionId: session.storyVersionId,
          targetSceneKeyOrId,
          worldId: session.worldId,
          householdId,
          sessionId,
        });

        return NextResponse.json(
          {
            ...("committedChoice" in result
              ? result
              : { committedChoice: result }),
            worldConsequence,
            locationSync,
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
