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

const LUMI_ASSET_STYLE_DIRECTION = [
  "STYLE - Match the already generated LUMI character canon: premium children's fantasy storybook concept art, handcrafted painterly 3D depth, delicate gouache-and-watercolor surface texture, crisp readable silhouette, clean controlled edges, warm soft studio lighting, rich harmonious colors and slightly simplified toyetic proportions.",
  "This must look like an in-universe illustrated game/story inventory asset that belongs beside the character reference sheet, not a real product photo.",
  "Avoid photorealism, catalogue photography, ecommerce packshot styling, ultra-real material scans, macro texture, hard product shadows, plastic toy render, flat vector icon, generic clip art, mockup, logo, text, UI frame or watermark.",
].join(" ");

function renderPrompt(item: {
  displayName: string;
  category: string;
  rarity: string;
}) {
  return [
    `Create one isolated inventory item illustration for the LUMI child-safe storybook inventory.`,
    `Item: ${item.displayName}; category ${item.category}; rarity ${item.rarity}.`,
    LUMI_ASSET_STYLE_DIRECTION,
    `Show exactly one stylized item centered in a front three-quarter view with generous safe margins, a warm softly textured ivory studio background and a subtle grounding shadow.`,
    `Do not add people, hands, labels, letters, numbers, borders, logos, scenery, duplicates, or watermarks.`,
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
      const storage = createCharacterVisualStorageAdapter();
      const batchId = crypto.randomUUID();
      const assets = [];
      const costMetadata = [];
      for (const [index, item] of (
        items as NonNullable<(typeof items)[number]>[]
      ).entries()) {
        if (existing[index]) {
          assets.push(existing[index]);
          continue;
        }
        const generated = await adapter.generate({
          jobId: crypto.randomUUID(),
          brief: null as never,
          prompt: renderPrompt(item),
          model: "krea/krea-2-medium-turbo",
          candidateCount: 1,
          aspectRatio: "1:1",
          resolution: "1K",
        });
        const candidate = generated.candidates[0];
        if (!candidate) throw new Error("ITEM_IMAGE_EMPTY");
        const stored = await storage.store({
          householdId: input.householdId,
          characterId: item.id,
          jobId: batchId,
          candidateIndex: index,
          bytesBase64: candidate.bytesBase64,
          mimeType: candidate.mimeType,
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
            mimeType: candidate.mimeType,
            ...(typeof candidate.width === "number"
              ? { width: candidate.width }
              : {}),
            ...(typeof candidate.height === "number"
              ? { height: candidate.height }
              : {}),
            provider: generated.provider,
            model: generated.model,
            originType: "generated",
            sourceSystem: "item-direct-v1",
            provenance: {
              batchId,
              idempotencyKey: input.idempotencyKey,
              itemIndex: index,
              providerRequestId: generated.providerRequestId ?? null,
            },
          },
          deps,
        );
        await selectManagedAssetCanon(parent.id, scope, asset.id, deps);
        assets.push(asset);
        if (generated.costMetadata) costMetadata.push(generated.costMetadata);
      }
      return NextResponse.json(
        { batchId, assets, costMetadata },
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
