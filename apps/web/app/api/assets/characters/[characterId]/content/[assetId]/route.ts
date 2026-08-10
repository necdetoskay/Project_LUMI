import { NextResponse } from "next/server";
import { z } from "zod";

import { withParent } from "@/lib/auth/with-parent";
import { readLocalCharacterVisual } from "@/lib/assets/character-visual-storage";
import {
  getOwnedHousehold,
  listCharacterVisualCandidates,
} from "@lumi/profiles/application";

const paramsSchema = z.object({
  characterId: z.string().uuid(),
  assetId: z.string().uuid(),
});

export async function GET(
  request: Request,
  {
    params,
  }: { params: Promise<{ characterId: string; assetId: string }> },
) {
  return withParent(async (parent) => {
    try {
      const parsed = paramsSchema.parse(await params);
      const householdId = new URL(request.url).searchParams.get("householdId");
      const household = await getOwnedHousehold(parent.id);
      if (!householdId || !household || household.id !== householdId) {
        return NextResponse.json({ error: "HOUSEHOLD_FORBIDDEN" }, { status: 403 });
      }

      const candidates = await listCharacterVisualCandidates(
        parent.id,
        householdId,
        parsed.characterId,
      );
      const asset = candidates.find((entry) => entry.id === parsed.assetId);
      if (!asset) {
        return NextResponse.json({ error: "VISUAL_ASSET_NOT_FOUND" }, { status: 404 });
      }

      const content = await readLocalCharacterVisual(asset.storageRef);
      return new Response(content.bytes, {
        status: 200,
        headers: {
          "Content-Type": asset.mimeType ?? content.mimeType,
          "Cache-Control": "private, max-age=60",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "VISUAL_CONTENT_ERROR";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  });
}
