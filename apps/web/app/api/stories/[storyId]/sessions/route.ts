import { NextResponse } from "next/server";
import { z } from "zod";
import { withParent } from "@/lib/auth/with-parent";
import { readRequestBody } from "@/lib/http/request-body";
import {
  getOwnedHousehold,
  findChildProfileForUser,
  getCharacterDomain,
} from "@lumi/profiles/application";
import { getWorldOrForbidden } from "@lumi/world/application";
import { startSession, getStoryDefinitionById } from "@lumi/story/application";
import { observeHandler } from "@/lib/observability/observed-api-route";

const paramsSchema = z.object({
  storyId: z.string().uuid(),
});

const bodySchema = z.object({
  householdId: z.string().uuid(),
  childProfileId: z.string().uuid(),
  worldId: z.string().uuid(),
  storyVersionId: z.string().uuid(),
  characterId: z.string().uuid(),
  playbackMode: z.enum(["reading", "narrated", "mixed"]).optional(),
  idempotencyKey: z.string().min(1).optional(),
  launchContext: z
    .object({
      sourceId: z.string().min(1),
      sourceKind: z.enum(["world_state", "inventory", "origin"]),
      sourceTitle: z.string().min(1),
      sourceSummary: z.string().min(1).optional(),
      sourceDetail: z.string().min(1).optional(),
    })
    .optional(),
});

function handleStoryError(error: unknown) {
  const err = error as Error & { code?: string };
  const message = err.message ?? "Unknown error";

  if (
    err.name === "AuthorizationError" ||
    message.includes("not a member") ||
    message.includes("not accessible")
  ) {
    return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
  }
  if (err.name === "NotFoundError") {
    return NextResponse.json({ error: "NOT_FOUND", message }, { status: 404 });
  }
  if (err.name === "ValidationError") {
    const status =
      err.code === "VERSION_NOT_PUBLISHED" ||
      err.code === "SESSION_ALREADY_EXISTS"
        ? 409
        : 400;
    return NextResponse.json(
      { error: err.code ?? "VALIDATION_ERROR", message },
      { status },
    );
  }
  if (err.name === "DomainError" && err.code === "VERSION_CONFLICT") {
    return NextResponse.json(
      { error: "VERSION_CONFLICT", message },
      { status: 409 },
    );
  }
  return NextResponse.json(
    { error: "INTERNAL_ERROR", message: "Failed to start story session" },
    { status: 500 },
  );
}

export const POST = observeHandler(
  async (
    request: Request,
    { params }: { params: Promise<{ storyId: string }> },
  ) => {
    return withParent(async (parent) => {
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

      const { storyId } = parsedParams.data;
      const {
        householdId,
        childProfileId,
        worldId,
        storyVersionId,
        characterId,
        playbackMode,
        idempotencyKey,
        launchContext,
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
        const childProfile = await findChildProfileForUser(
          childProfileId,
          parent.id,
          householdId,
        );
        if (!childProfile) {
          return NextResponse.json(
            {
              error: "FORBIDDEN",
              message: "Child profile not found or not accessible",
            },
            { status: 403 },
          );
        }

        await getWorldOrForbidden(worldId, householdId);

        const character = await getCharacterDomain(
          parent.id,
          householdId,
          characterId,
        );
        if (character.childProfileId !== childProfileId) {
          return NextResponse.json(
            {
              error: "FORBIDDEN",
              message: "Character does not belong to the given child profile",
            },
            { status: 403 },
          );
        }

        const definition = await getStoryDefinitionById(storyId);
        if (definition.householdId !== householdId) {
          return NextResponse.json(
            { error: "NOT_FOUND", message: "Story not found" },
            { status: 404 },
          );
        }

        const result = await startSession({
          householdId,
          childProfileId,
          worldId,
          storyDefinitionId: storyId,
          storyVersionId,
          characterId,
          playbackMode,
          idempotencyKey,
          actorUserId: parent.id,
          contextSnapshot: launchContext
            ? {
                launchContext: {
                  sourceId: launchContext.sourceId,
                  sourceKind: launchContext.sourceKind,
                  sourceTitle: launchContext.sourceTitle,
                  sourceSummary: launchContext.sourceSummary ?? null,
                  sourceDetail: launchContext.sourceDetail ?? null,
                },
              }
            : undefined,
        });

        return NextResponse.json({ session: result }, { status: 201 });
      } catch (error) {
        return handleStoryError(error);
      }
    });
  },
  "/api/stories/{storyId}/sessions",
);
