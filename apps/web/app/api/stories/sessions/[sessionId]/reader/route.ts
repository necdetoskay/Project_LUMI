import { NextResponse } from "next/server";
import { z } from "zod";

import { withParent } from "@/lib/auth/with-parent";
import { observeHandler } from "@/lib/observability/observed-api-route";
import { handleStoryError } from "@/lib/story-api/error";
import { getOwnedHousehold } from "@lumi/profiles/application";
import {
  evaluateChoicePointAvailability,
  getSessionPlaybackState,
  getStorySessionOrForbidden,
  getStoryVersionGraph,
  listChoicePointsByScene,
} from "@lumi/story/application";

const paramsSchema = z.object({
  sessionId: z.string().uuid(),
});

type SceneRecord = {
  id: string;
  sceneKey: string;
};

function resolveNextSceneId(
  option: { consequencePreviews?: unknown },
  scenes: SceneRecord[],
): string | null {
  const previews = Array.isArray(option.consequencePreviews)
    ? option.consequencePreviews
    : [];

  for (const preview of previews) {
    if (!preview || typeof preview !== "object") {
      continue;
    }

    const targetKey = (preview as { targetKey?: unknown }).targetKey;
    if (typeof targetKey !== "string" || targetKey.length === 0) {
      continue;
    }

    const nextScene = scenes.find(
      (scene) => scene.id === targetKey || scene.sceneKey === targetKey,
    );
    if (nextScene) {
      return nextScene.id;
    }
  }

  return null;
}

export const GET = observeHandler(
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
      if (!parsedParams.success) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: parsedParams.error.message },
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
        const playback = await getSessionPlaybackState(sessionId);
        const graph = await getStoryVersionGraph(
          playback.session.storyVersionId,
        );
        const currentSceneId = playback.currentScene?.id;
        const checkpointHash =
          playback.latestCheckpoint?.contentHash ??
          `${playback.session.id}:${playback.session.version}`;

        const choicePoints = currentSceneId
          ? await listChoicePointsByScene(currentSceneId)
          : [];

        const choices = await Promise.all(
          choicePoints.map(async (point) => {
            const evaluation = await evaluateChoicePointAvailability(
              sessionId,
              point.id,
              currentSceneId ?? "",
              playback.session.storyVersionId,
              checkpointHash,
            );

            return {
              point: evaluation.point,
              options: evaluation.options.map((entry) => ({
                ...entry,
                nextSceneId: resolveNextSceneId(
                  entry.option as { consequencePreviews?: unknown },
                  graph.scenes.map((scene) => ({
                    id: scene.id,
                    sceneKey: scene.sceneKey,
                  })),
                ),
              })),
            };
          }),
        );

        return NextResponse.json({
          playback,
          graph: {
            definition: graph.definition,
            version: graph.version,
            transitions: graph.transitions.filter(
              (transition) => transition.fromSceneId === currentSceneId,
            ),
          },
          choices,
        });
      } catch (error) {
        return handleStoryError(error, "Failed to load story reader state");
      }
    });
  },
  "/api/stories/sessions/{sessionId}/reader",
);
