import { NextResponse } from "next/server";
import { z } from "zod";

import { withParent } from "@/lib/auth/with-parent";
import { WebManagedAssetAuthorizationAdapter } from "@/lib/assets/managed-asset-authorization";
import { createCharacterVisualStorageAdapter } from "@/lib/assets/character-visual-storage";
import { splitItemStateGrid } from "@/lib/assets/item-state-grid";
import {
  compileVisualPrompt,
  getItemVisualStates,
  planItemStateGrid,
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

function compileItemStatePrompt(
  item: {
    displayName: string;
    category: string;
    rarity: string;
  },
  styleId: VisualStyleId,
  states: ReturnType<typeof getItemVisualStates>,
) {
  return compileVisualPrompt({
    assetType: "item",
    styleId,
    identity: [
      `OBJECT NAME: ${item.displayName}`,
      `OBJECT CATEGORY: ${item.category}`,
      `RARITY / VISUAL IMPORTANCE: ${item.rarity}`,
      "Create canonical inventory artwork of this physical object only",
    ],
    states,
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

      const resolvedItems = items as NonNullable<(typeof items)[number]>[];
      const deps = {
        authorizationPort: new WebManagedAssetAuthorizationAdapter(),
      };
      const existingByItem = await Promise.all(
        resolvedItems.map(async (item) => {
          const assets = await listManagedAssets(
            parent.id,
            {
              householdId: input.householdId,
              subjectType: "item",
              subjectId: item.id,
            },
            deps,
          );
          return assets.filter(
            (asset) =>
              asset.assetKind === "item-icon" &&
              asset.provenance.idempotencyKey === input.idempotencyKey,
          );
        }),
      );

      const isCompleteReplay = resolvedItems.every((item, itemIndex) => {
        const expected = getItemVisualStates(item.category);
        const existing = existingByItem[itemIndex] ?? [];
        return expected.every((state) =>
          existing.some((asset) => asset.provenance.stateId === state.id),
        );
      });
      if (isCompleteReplay) {
        return NextResponse.json({
          assets: existingByItem.flat(),
          stateAssets: existingByItem.flat(),
          replayed: true,
          visualStyle: input.styleId,
        });
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
      const canonicalAssets = [];
      const stateAssets = [];
      const costMetadata = [];

      for (const [itemIndex, item] of resolvedItems.entries()) {
        const states = getItemVisualStates(item.category);
        const gridBatches = planItemStateGrid(states, 4);
        const scope = {
          householdId: input.householdId,
          subjectType: "item" as const,
          subjectId: item.id,
        };
        const existingForItem = existingByItem[itemIndex] ?? [];
        const assetsByState = new Map(
          existingForItem
            .filter((asset) => typeof asset.provenance.stateId === "string")
            .map((asset) => [asset.provenance.stateId as string, asset]),
        );

        for (const [gridBatchIndex, gridStates] of gridBatches.entries()) {
          const missingStates = gridStates.filter(
            (state) => !assetsByState.has(state.id),
          );
          if (missingStates.length === 0) continue;

          const compiled = compileItemStatePrompt(
            item,
            input.styleId,
            gridStates,
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

          const panels = splitItemStateGrid({
            bytesBase64: candidate.bytesBase64,
            mimeType: candidate.mimeType,
            stateIds: gridStates.map((state) => state.id),
            maxOutputSize: 300,
          });

          for (const [gridPanelIndex, panel] of panels.entries()) {
            if (assetsByState.has(panel.stateId)) continue;
            const state = gridStates.find(
              (entry) => entry.id === panel.stateId,
            );
            if (!state) throw new Error("ITEM_STATE_GRID_STATE_MISMATCH");

            const stored = await storage.store({
              householdId: input.householdId,
              characterId: item.id,
              jobId: batchId,
              candidateIndex:
                itemIndex * 100 + gridBatchIndex * 10 + gridPanelIndex,
              bytesBase64: panel.bytesBase64,
              mimeType: panel.mimeType,
            });
            const asset = await registerManagedAssetMetadata(
              parent.id,
              {
                ...scope,
                assetKind: "item-icon",
                storageRef: stored.storageRef,
                mimeType: panel.mimeType,
                width: panel.width,
                height: panel.height,
                provider: generated.provider,
                model: generated.model,
                originType: "generated",
                sourceSystem: "item-state-grid-v1",
                provenance: {
                  batchId,
                  idempotencyKey: input.idempotencyKey,
                  itemIndex,
                  providerRequestId: generated.providerRequestId ?? null,
                  styleId: compiled.styleId,
                  styleVersion: compiled.styleVersion,
                  stateId: state.id,
                  stateLabel: state.label,
                  gridBatchIndex,
                  gridPanelIndex,
                  gridStateIds: compiled.stateIds,
                  outputMaxPx: 300,
                  promptCompiler: "lumi-visual-style-v1",
                },
              },
              deps,
            );
            assetsByState.set(state.id, asset);
          }
          if (generated.costMetadata) costMetadata.push(generated.costMetadata);
        }

        const orderedAssets = states
          .map((state) => assetsByState.get(state.id))
          .filter(Boolean) as NonNullable<
          ReturnType<typeof assetsByState.get>
        >[];
        if (orderedAssets.length !== states.length) {
          throw new Error("ITEM_STATE_ASSET_SET_INCOMPLETE");
        }

        const canonical = orderedAssets[0];
        if (!canonical) throw new Error("ITEM_CANONICAL_STATE_MISSING");
        await selectManagedAssetCanon(parent.id, scope, canonical.id, deps);
        canonicalAssets.push(canonical);
        stateAssets.push(...orderedAssets);
      }

      return NextResponse.json(
        {
          batchId,
          assets: canonicalAssets,
          stateAssets,
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
