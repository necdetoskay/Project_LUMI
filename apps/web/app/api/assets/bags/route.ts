import sharp from "sharp";
import { NextResponse } from "next/server";
import { z } from "zod";

import { WebManagedAssetAuthorizationAdapter } from "@/lib/assets/managed-asset-authorization";
import { createCharacterVisualStorageAdapter } from "@/lib/assets/character-visual-storage";
import { withParent } from "@/lib/auth/with-parent";
import { OpenRouterCharacterVisualGenerationAdapter } from "@lumi/profiles/adapters";
import {
  getOpenRouterApiKey,
  getOwnedHousehold,
  registerManagedAssetMetadata,
  selectManagedAssetCanon,
} from "@lumi/profiles/application";

const inputSchema = z.object({
  householdId: z.string().uuid(),
  characterId: z.string().uuid(),
  characterName: z.string().min(1).max(120),
  idempotencyKey: z.string().min(1).max(160),
});

const BAG_VARIANTS = ["bag-closed", "bag-open"] as const;

function bagPrompt(characterName: string) {
  return [
    "Create one strict 2-column by 1-row storybook inventory bag reference sheet.",
    `The bag belongs to ${characterName}; both cells must show the exact same child-safe fantasy travel bag with identical materials, colors, decorations, scale, and camera angle.`,
    "Left cell: bag fully closed. Right cell: the same bag fully open, with an empty interior clearly visible so item icons can be presented beside it in the UI.",
    "Use equal borderless cells, centered objects, generous safe margins, uniform pale background, soft lighting.",
    "No people, hands, loose items, labels, letters, numbers, panel borders, scenery, duplicates, logos, or watermarks.",
  ].join(" ");
}

export async function POST(request: Request) {
  return withParent(async (parent) => {
    try {
      const input = inputSchema.parse(await request.json());
      const household = await getOwnedHousehold(parent.id);
      if (!household || household.id !== input.householdId) {
        return NextResponse.json(
          { error: "HOUSEHOLD_FORBIDDEN" },
          { status: 403 },
        );
      }
      const apiKey = await getOpenRouterApiKey(parent.id, input.householdId);
      if (!apiKey) {
        return NextResponse.json(
          { error: "OPENROUTER_API_KEY_NOT_CONFIGURED" },
          { status: 409 },
        );
      }

      const generated = await new OpenRouterCharacterVisualGenerationAdapter({
        apiKey,
      }).generate({
        jobId: crypto.randomUUID(),
        brief: null as never,
        prompt: bagPrompt(input.characterName),
        model: "krea/krea-2-medium-turbo",
        candidateCount: 1,
        aspectRatio: "3:2",
        resolution: "1K",
      });
      const candidate = generated.candidates[0];
      if (!candidate) throw new Error("BAG_SHEET_EMPTY");
      const source = Buffer.from(candidate.bytesBase64, "base64");
      const metadata = await sharp(source).metadata();
      if (!metadata.width || !metadata.height) {
        throw new Error("BAG_SHEET_DIMENSIONS_MISSING");
      }
      const cellWidth = Math.floor(metadata.width / 2);
      if (cellWidth < 128 || metadata.height < 128) {
        throw new Error("BAG_SHEET_TOO_SMALL");
      }

      const storage = createCharacterVisualStorageAdapter();
      const authorizationPort = new WebManagedAssetAuthorizationAdapter();
      const batchId = crypto.randomUUID();
      const assets = [];
      for (const [index, assetKind] of BAG_VARIANTS.entries()) {
        const crop = {
          left: index * cellWidth,
          top: 0,
          width: cellWidth,
          height: metadata.height,
        };
        const bytes = await sharp(source)
          .extract(crop)
          .webp({ quality: 90 })
          .toBuffer();
        const stored = await storage.store({
          householdId: input.householdId,
          characterId: input.characterId,
          jobId: batchId,
          candidateIndex: index,
          bytesBase64: bytes.toString("base64"),
          mimeType: "image/webp",
        });
        const scope = {
          householdId: input.householdId,
          subjectType: "character" as const,
          subjectId: input.characterId,
        };
        const asset = await registerManagedAssetMetadata(
          parent.id,
          {
            ...scope,
            assetKind,
            storageRef: stored.storageRef,
            mimeType: "image/webp",
            width: cellWidth,
            height: metadata.height,
            provider: generated.provider,
            model: generated.model,
            originType: "derived",
            sourceSystem: "bag-reference-sheet-v1",
            provenance: {
              batchId,
              idempotencyKey: input.idempotencyKey,
              cellIndex: index,
              crop,
              providerRequestId: generated.providerRequestId ?? null,
            },
          },
          { authorizationPort },
        );
        await selectManagedAssetCanon(parent.id, scope, asset.id, {
          authorizationPort,
        });
        assets.push(asset);
      }
      return NextResponse.json(
        { batchId, assets, costMetadata: generated.costMetadata },
        { status: 201 },
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "BAG_GENERATION_FAILED";
      const status = message.includes("FORBIDDEN")
        ? 403
        : message.includes("API_KEY_NOT_CONFIGURED")
          ? 409
          : 400;
      return NextResponse.json({ error: message }, { status });
    }
  });
}
