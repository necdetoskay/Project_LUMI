import { NextResponse } from "next/server";
import { z } from "zod";

import { WebStoryVisualGenerationAdapter } from "@/lib/assets/story-visual-generation";
import { withParent } from "@/lib/auth/with-parent";
import {
  generateStoryVisuals,
  loadStoryVisualWorkspace,
} from "@lumi/media/application";
import { getVisualStyleProfile } from "@lumi/media";
import {
  DrizzleStoryVisualWorkspaceRepository,
  getMediaDb,
} from "@lumi/media/db";
import {
  getOpenRouterApiKey,
  getOwnedHousehold,
} from "@lumi/profiles/application";
import { getSessionById } from "@lumi/story/application";

const paramsSchema = z.object({ sessionId: z.string().uuid() });
const styleSchema = z.enum([
  "lumi-storybook",
  "soft-3d-adventure",
  "paper-cut-world",
  "colored-pencil-dreams",
  "classic-fairytale",
  "minimal-pastel",
]);
const inputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("generate-missing") }),
  z.object({
    action: z.literal("regenerate"),
    requirementKey: z.string().min(1).max(300),
  }),
  z.object({ action: z.literal("change-style"), styleId: styleSchema }),
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  return withParent(async (parent) => {
    try {
      const { sessionId } = paramsSchema.parse(await params);
      const action = inputSchema.parse(await request.json());
      const household = await getOwnedHousehold(parent.id);
      if (!household) {
        return NextResponse.json({ error: "HOUSEHOLD_NOT_FOUND" }, { status: 404 });
      }

      const session = await getSessionById(sessionId);
      if (!session || session.householdId !== household.id) {
        return NextResponse.json({ error: "STORY_SESSION_FORBIDDEN" }, { status: 403 });
      }

      const scope = {
        householdId: session.householdId,
        childProfileId: session.childProfileId,
        worldId: session.worldId,
      };
      const repository = new DrizzleStoryVisualWorkspaceRepository(getMediaDb());
      let storyId = session.id;
      let workspace = await loadStoryVisualWorkspace({
        repository,
        storyId,
        scope,
      });
      if (!workspace.manifest) {
        storyId = session.storyDefinitionId;
        workspace = await loadStoryVisualWorkspace({
          repository,
          storyId,
          scope,
        });
      }
      if (!workspace.manifest) {
        return NextResponse.json(
          { error: "STORY_VISUAL_MANIFEST_NOT_FOUND" },
          { status: 409 },
        );
      }

      if (action.action === "change-style") {
        const profile = getVisualStyleProfile(action.styleId);
        const nextAssetSet = await repository.createAssetSet({
          manifestId: workspace.manifest.id,
          scope,
          assetSet: {
            id: crypto.randomUUID(),
            storyId,
            manifestFingerprint: workspace.manifest.manifestFingerprint,
            styleId: profile.id,
            styleVersion: profile.version,
            status: "planned",
            active: false,
            createdAt: new Date().toISOString(),
          },
        });
        const active = await repository.setActiveAssetSet(
          nextAssetSet.id,
          storyId,
          scope,
        );
        return NextResponse.json({ assetSet: active }, { status: 201 });
      }

      const apiKey = await getOpenRouterApiKey(parent.id, household.id);
      if (!apiKey) {
        return NextResponse.json(
          { error: "OPENROUTER_API_KEY_NOT_CONFIGURED" },
          { status: 409 },
        );
      }

      const result = await generateStoryVisuals({
        repository,
        generator: new WebStoryVisualGenerationAdapter(
          apiKey,
          parent.id,
          household.id,
        ),
        request: {
          storyId,
          scope,
          ...(action.action === "regenerate"
            ? { requirementKeys: [action.requirementKey], force: true }
            : {}),
        },
      });

      return NextResponse.json(result, { status: 200 });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "STORY_VISUAL_ACTION_FAILED";
      return NextResponse.json(
        { error: message },
        { status: message.includes("FORBIDDEN") ? 403 : 400 },
      );
    }
  });
}
