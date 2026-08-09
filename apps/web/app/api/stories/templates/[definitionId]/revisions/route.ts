import { NextResponse } from "next/server";
import { z } from "zod";

import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import { observeHandler } from "@/lib/observability/observed-api-route";
import { handleStoryError } from "@/lib/story-api/error";
import { getOwnedHousehold } from "@lumi/profiles/application";
import {
  createStoryTemplateRevision,
  listStoryTemplateVersions,
} from "@lumi/story/application";

const paramsSchema = z.object({ definitionId: z.string().uuid() });
const sceneSchema = z.object({
  sceneKey: z.string().min(1),
  sequenceNumber: z.number().int().nonnegative(),
  sceneType: z.string().min(1),
  title: z.string().min(1).optional(),
  narrativeText: z.string().min(1),
  isEntryScene: z.boolean().optional(),
  isTerminalScene: z.boolean().optional(),
});
const transitionSchema = z.object({
  fromSceneKey: z.string().min(1),
  toSceneKey: z.string().min(1),
  transitionType: z.string().min(1),
  priority: z.number().int().optional(),
});
const bodySchema = z.object({
  sourceVersionId: z.string().uuid().optional(),
  title: z.string().min(1).optional(),
  storyMode: z.enum(["static", "interactive"]).optional(),
  scenes: z.array(sceneSchema).optional(),
  transitions: z.array(transitionSchema).optional(),
});

async function resolveOwnedHousehold(parentId: string, request: Request) {
  const householdId = new URL(request.url).searchParams.get("householdId");
  if (!householdId) {
    return {
      response: NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "householdId query parameter is required",
        },
        { status: 400 },
      ),
    };
  }
  const household = await getOwnedHousehold(parentId);
  if (!household || household.id !== householdId) {
    return {
      response: NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "User does not have access to this household",
        },
        { status: 403 },
      ),
    };
  }
  return { householdId };
}

export const GET = observeHandler(
  async (
    request: Request,
    { params }: { params: Promise<{ definitionId: string }> },
  ) =>
    withParent(async (parent) => {
      const owned = await resolveOwnedHousehold(parent.id, request);
      if ("response" in owned) return owned.response;
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
      try {
        return NextResponse.json(
          await listStoryTemplateVersions({
            householdId: owned.householdId,
            storyDefinitionId: parsedParams.data.definitionId,
          }),
        );
      } catch (error) {
        return handleStoryError(
          error,
          "Failed to list story template revisions",
        );
      }
    }),
  "/api/stories/templates/{definitionId}/revisions",
);

export const POST = observeHandler(
  async (
    request: Request,
    { params }: { params: Promise<{ definitionId: string }> },
  ) =>
    withParent(async (parent) => {
      const owned = await resolveOwnedHousehold(parent.id, request);
      if ("response" in owned) return owned.response;
      const parsedParams = paramsSchema.safeParse(await params);
      const parsedBody = bodySchema.safeParse(await readRequestBody(request));
      if (!parsedParams.success || !parsedBody.success) {
        return NextResponse.json(
          {
            error: "VALIDATION_ERROR",
            message: [
              parsedParams.success ? "" : parsedParams.error.message,
              parsedBody.success ? "" : parsedBody.error.message,
            ]
              .filter(Boolean)
              .join("; "),
          },
          { status: 400 },
        );
      }

      const body = parsedBody.data;
      const scenes = body.scenes?.map((scene) => ({
        sceneKey: scene.sceneKey,
        sequenceNumber: scene.sequenceNumber,
        sceneType: scene.sceneType,
        narrativeText: scene.narrativeText,
        ...(scene.title !== undefined ? { title: scene.title } : {}),
        ...(scene.isEntryScene !== undefined
          ? { isEntryScene: scene.isEntryScene }
          : {}),
        ...(scene.isTerminalScene !== undefined
          ? { isTerminalScene: scene.isTerminalScene }
          : {}),
      }));
      const transitions = body.transitions?.map((transition) => ({
        fromSceneKey: transition.fromSceneKey,
        toSceneKey: transition.toSceneKey,
        transitionType: transition.transitionType,
        ...(transition.priority !== undefined
          ? { priority: transition.priority }
          : {}),
      }));

      try {
        return NextResponse.json(
          await createStoryTemplateRevision({
            householdId: owned.householdId,
            storyDefinitionId: parsedParams.data.definitionId,
            sourceVersionId: body.sourceVersionId,
            title: body.title,
            storyMode: body.storyMode,
            scenes,
            transitions,
          }),
          { status: 201 },
        );
      } catch (error) {
        return handleStoryError(
          error,
          "Failed to create story template revision",
        );
      }
    }),
  "/api/stories/templates/{definitionId}/revisions",
);
