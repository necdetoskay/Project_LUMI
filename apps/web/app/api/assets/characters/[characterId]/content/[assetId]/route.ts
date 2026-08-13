import { NextResponse } from "next/server";
import { z } from "zod";

import { withParent } from "@/lib/auth/with-parent";
import { readCharacterVisual } from "@/lib/assets/character-visual-storage";
import {
  getOwnedHousehold,
  listCharacterVisualCandidates,
} from "@lumi/profiles/application";

const paramsSchema = z.object({
  characterId: z.string().uuid(),
  assetId: z.string().uuid(),
});

function safeStorageDiagnostic(storageRef: string) {
  if (storageRef.startsWith("s3-character-visual://")) {
    const value = storageRef.slice("s3-character-visual://".length);
    const slash = value.indexOf("/");
    if (slash > 0) {
      return {
        storageType: "s3",
        referencedBucket: decodeURIComponent(value.slice(0, slash)),
        objectKey: value.slice(slash + 1),
        configuredBucket: process.env.OBJECT_STORAGE_BUCKET ?? null,
      };
    }
  }

  if (storageRef.startsWith("local-character-visual://")) {
    return {
      storageType: "local",
      localRef: storageRef.slice("local-character-visual://".length),
    };
  }

  return { storageType: "unknown" };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ characterId: string; assetId: string }> },
) {
  return withParent(async (parent) => {
    try {
      const parsed = paramsSchema.parse(await params);
      const householdId = new URL(request.url).searchParams.get("householdId");
      const household = await getOwnedHousehold(parent.id);
      if (!householdId || !household || household.id !== householdId) {
        return NextResponse.json(
          { error: "HOUSEHOLD_FORBIDDEN" },
          { status: 403 },
        );
      }

      const candidates = await listCharacterVisualCandidates(
        parent.id,
        householdId,
        parsed.characterId,
      );
      const asset = candidates.find((entry) => entry.id === parsed.assetId);
      if (!asset) {
        return NextResponse.json(
          { error: "VISUAL_ASSET_NOT_FOUND" },
          { status: 404 },
        );
      }

      try {
        const content = await readCharacterVisual(asset.storageRef);
        return new NextResponse(new Uint8Array(content.bytes), {
          status: 200,
          headers: {
            "Content-Type": asset.mimeType ?? content.mimeType,
            "Cache-Control": "private, max-age=60",
            "X-Content-Type-Options": "nosniff",
          },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "VISUAL_CONTENT_ERROR";
        return NextResponse.json(
          {
            error: message,
            diagnostic: safeStorageDiagnostic(asset.storageRef),
          },
          { status: 400 },
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "VISUAL_CONTENT_ERROR";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  });
}
