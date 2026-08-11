import sharp from "sharp";
import { NextResponse } from "next/server";
import { z } from "zod";

import { withParent } from "@/lib/auth/with-parent";
import { WebManagedAssetAuthorizationAdapter } from "@/lib/assets/managed-asset-authorization";
import { createCharacterVisualStorageAdapter } from "@/lib/assets/character-visual-storage";
import {
  getOpenRouterApiKey,
  getOwnedHousehold,
  listManagedAssets,
  listInventory,
  registerManagedAssetMetadata,
  selectManagedAssetCanon,
} from "@lumi/profiles/application";
import { OpenRouterCharacterVisualGenerationAdapter } from "@lumi/profiles/adapters";

const inputSchema = z.object({
  householdId: z.string().uuid(),
  characterId: z.string().uuid(),
  itemIds: z.array(z.string().uuid()).min(1).max(6),
  idempotencyKey: z.string().min(1).max(160),
});

function renderPrompt(
  items: Array<{ displayName: string; category: string; rarity: string }>,
) {
  const slots = items
    .map(
      (item, index) =>
        `Cell ${index + 1}: ${item.displayName}; category ${item.category}; rarity ${item.rarity}.`,
    )
    .join(" ");
  return [
    `Create one clean 3-column by 2-row inventory item sheet for a child-safe illustrated storybook.`,
    `Use six equal borderless cells in strict reading order. ${slots}`,
    `For every unused cell, leave it completely empty. Show exactly one isolated item centered in each used cell, front three-quarter view, generous safe margins, consistent soft lighting and a uniform pale background.`,
    `Do not add people, hands, labels, letters, numbers, panel borders, logos, scenery, duplicates, or watermarks. Keep each item's identity and cell position exact.`,
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
      const inventory = await listInventory(
        parent.id,
        input.householdId,
        "character",
        input.characterId,
      );
      const byId = new Map(inventory.map((item) => [item.id, item]));
      const items = input.itemIds.map((id) => byId.get(id));
      if (items.some((item) => !item)) {
        return NextResponse.json(
          { error: "INVENTORY_ITEM_FORBIDDEN" },
          { status: 403 },
        );
      }
      const deps = {
        authorizationPort: new WebManagedAssetAuthorizationAdapter(),
      };
      const existing = await Promise.all(
        (items as NonNullable<(typeof items)[number]>[]).map(async (item) => {
          const assets = await listManagedAssets(
            parent.id,
            {
              householdId: input.householdId,
              subjectType: "item",
              subjectId: item.id,
            },
            deps,
          );
          return assets.find(
            (asset) =>
              asset.assetKind === "item-icon" &&
              asset.provenance.idempotencyKey === input.idempotencyKey,
          );
        }),
      );
      if (existing.every(Boolean)) {
        return NextResponse.json({ assets: existing, replayed: true });
      }
      const apiKey = await getOpenRouterApiKey(parent.id, input.householdId);
      if (!apiKey) {
        return NextResponse.json(
          { error: "OPENROUTER_API_KEY_NOT_CONFIGURED" },
          { status: 409 },
        );
      }
      const adapter = new OpenRouterCharacterVisualGenerationAdapter({
        apiKey,
      });
      const generated = await adapter.generate({
        jobId: crypto.randomUUID(),
        brief: null as never,
        prompt: renderPrompt(items as NonNullable<(typeof items)[number]>[]),
        model: "krea/krea-2-medium-turbo",
        candidateCount: 1,
        aspectRatio: "3:2",
        resolution: "1K",
      });
      const candidate = generated.candidates[0];
      if (!candidate) throw new Error("ITEM_SHEET_EMPTY");
      const source = Buffer.from(candidate.bytesBase64, "base64");
      const metadata = await sharp(source).metadata();
      if (!metadata.width || !metadata.height)
        throw new Error("ITEM_SHEET_DIMENSIONS_MISSING");
      const cellWidth = Math.floor(metadata.width / 3);
      const cellHeight = Math.floor(metadata.height / 2);
      if (cellWidth < 128 || cellHeight < 128)
        throw new Error("ITEM_SHEET_TOO_SMALL");

      const storage = createCharacterVisualStorageAdapter();
      const batchId = crypto.randomUUID();
      const assets = [];
      for (const [index, item] of (
        items as NonNullable<(typeof items)[number]>[]
      ).entries()) {
        const crop = {
          left: (index % 3) * cellWidth,
          top: Math.floor(index / 3) * cellHeight,
          width: cellWidth,
          height: cellHeight,
        };
        const bytes = await sharp(source)
          .extract(crop)
          .webp({ quality: 90 })
          .toBuffer();
        const stored = await storage.store({
          householdId: input.householdId,
          characterId: item.id,
          jobId: batchId,
          candidateIndex: index,
          bytesBase64: bytes.toString("base64"),
          mimeType: "image/webp",
        });
        const scope = {
          householdId: input.householdId,
          subjectType: "item" as const,
          subjectId: item.id,
        };
        const asset = await registerManagedAssetMetadata(
          parent.id,
          {
            ...scope,
            assetKind: "item-icon",
            storageRef: stored.storageRef,
            mimeType: "image/webp",
            width: cellWidth,
            height: cellHeight,
            provider: generated.provider,
            model: generated.model,
            originType: "derived",
            sourceSystem: "item-batch-sheet-v1",
            provenance: {
              batchId,
              idempotencyKey: input.idempotencyKey,
              cellIndex: index,
              crop,
              providerRequestId: generated.providerRequestId ?? null,
            },
          },
          deps,
        );
        await selectManagedAssetCanon(parent.id, scope, asset.id, deps);
        assets.push(asset);
      }
      return NextResponse.json(
        { batchId, assets, costMetadata: generated.costMetadata },
        { status: 201 },
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ITEM_BATCH_GENERATION_FAILED";
      return NextResponse.json(
        { error: message },
        { status: message.includes("FORBIDDEN") ? 403 : 400 },
      );
    }
  });
}
