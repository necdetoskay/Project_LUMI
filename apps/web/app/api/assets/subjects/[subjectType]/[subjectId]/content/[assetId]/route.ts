import { NextResponse } from "next/server";
import { z } from "zod";

import { readCharacterVisual } from "@/lib/assets/character-visual-storage";
import { readManagedImage } from "@/lib/assets/managed-image-storage";
import { WebManagedAssetAuthorizationAdapter } from "@/lib/assets/managed-asset-authorization";
import { withParent } from "@/lib/auth/with-parent";
import { listManagedAssets } from "@lumi/profiles/application";

const paramsSchema = z.object({
  subjectType: z.enum(["character", "npc", "location", "item", "story_scene"]),
  subjectId: z.string().uuid(),
  assetId: z.string().uuid(),
});

async function readCompatibleImage(storageRef: string) {
  try {
    return await readManagedImage(storageRef);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "UNSUPPORTED_MANAGED_IMAGE_STORAGE_REF"
    ) {
      return readCharacterVisual(storageRef);
    }
    throw error;
  }
}

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      subjectType: string;
      subjectId: string;
      assetId: string;
    }>;
  },
) {
  return withParent(async (parent) => {
    try {
      const parsed = paramsSchema.parse(await params);
      const householdId = new URL(request.url).searchParams.get("householdId");
      if (!householdId) {
        return NextResponse.json(
          { error: "HOUSEHOLD_ID_REQUIRED" },
          { status: 400 },
        );
      }

      const scope = {
        householdId,
        subjectType: parsed.subjectType,
        subjectId: parsed.subjectId,
      };
      const assets = await listManagedAssets(parent.id, scope, {
        authorizationPort: new WebManagedAssetAuthorizationAdapter(),
      });
      const asset = assets.find((candidate) => candidate.id === parsed.assetId);
      if (!asset) {
        return NextResponse.json(
          { error: "MANAGED_ASSET_NOT_FOUND" },
          { status: 404 },
        );
      }

      const object = await readCompatibleImage(asset.storageRef);
      return new NextResponse(object.bytes, {
        status: 200,
        headers: {
          "Content-Type": object.mimeType,
          "Cache-Control": "private, max-age=3600",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "MANAGED_ASSET_CONTENT_ERROR";
      const status = message.includes("FORBIDDEN")
        ? 403
        : message.includes("NOT_FOUND")
          ? 404
          : message.includes("RESOLVER_NOT_AVAILABLE")
            ? 501
            : 400;
      return NextResponse.json({ error: message }, { status });
    }
  });
}
