import { NextResponse } from "next/server";
import { z } from "zod";

import { withParent } from "@/lib/auth/with-parent";
import { WebManagedAssetAuthorizationAdapter } from "@/lib/assets/managed-asset-authorization";
import { createCharacterVisualStorageAdapter } from "@/lib/assets/character-visual-storage";
import {
  compileVisualPrompt,
  getItemVisualStates,
  type VisualStyleId,
} from "@lumi/media";
import {
  getOpenRouterApiKey,
  getOwnedHousehold,
  listManagedAssets,
  listInventory,
  registerManagedAssetMetadata,
  selectManagedAssetCanon,
} from "@lumi/profiles/application";
import { OpenRouterCharacterVisualGenerationAdapter } from "@lumi/profiles/adapters";

const visualStyleSchema = z.enum([
  "lumi-storybook",
  "soft-3d-adventure",
  "paper-cut-world",
  "colored-pencil-dreams",
  "classic-fairytale",
  "minimal-pastel",
]);

const inputSchema = z.object({
  householdId: z.string().uuid(),
  characterId: z.string().uuid(),
  itemIds: z.array(z.string().uuid()).min(1).max(6),
  idempotencyKey: z.string().min(1).max(160),
  styleId: visualStyleSchema.default("lumi-storybook"),
});

function compileItemIconPrompt(
  item: {
    displayName: string;
    category: string;
    rarity: string;
  },
  styleId: VisualStyleId,
) {
  return compileVisualPrompt({
    assetType: "item",
    styleId,
    identity: [
      `OBJECT NAME: ${item.displayName}`,
      `OBJECT CATEGORY: ${item.category}`,
      `RARITY / VISUAL IMPORTANCE: ${item.rarity}`,
      "Create one canonical inventory icon of this physical object only",
    ],
  });
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

        const compiled = compileItemIconPrompt(item, input.styleId);
        const plannedStateIds = getItemVisualStates(item.category).map(
          (state) => state.id,
        );
        const generated = await adapter.generate({
          jobId: crypto.randomUUID(),
          brief: null as never,
          prompt: compiled.prompt,
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
            sourceSystem: "item-visual-style-v1",
            provenance: {
              batchId,
              idempotencyKey: input.idempotencyKey,
              itemIndex: index,
              providerRequestId: generated.providerRequestId ?? null,
              styleId: compiled.styleId,
              styleVersion: compiled.styleVersion,
              plannedStateIds,
              promptCompiler: "lumi-visual-style-v1",
            },
          },
          deps,
        );
        await selectManagedAssetCanon(parent.id, scope, asset.id, deps);
        assets.push(asset);
        if (generated.costMetadata) costMetadata.push(generated.costMetadata);
      }
      return NextResponse.json(
        {
          batchId,
          assets,
          costMetadata,
          visualStyle: input.styleId,
        },
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
