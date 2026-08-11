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

function bagPrompt(
  characterName: string,
  variant: (typeof BAG_VARIANTS)[number],
) {
  const state =
    variant === "bag-closed"
      ? "fully closed, viewed from the front three-quarter angle"
      : "fully open, viewed from the front three-quarter angle, with an empty interior clearly visible";
  return [
    "Create one isolated child-safe fantasy travel bag illustration for a storybook inventory.",
    `The bag belongs to ${characterName}. Show the bag ${state}.`,
    "Use a warm brown canvas body, teal flap, two brass buckles and a small golden star patch so the open and closed variants share a stable canonical design.",
    "Center one bag with generous safe margins, a uniform pale background and soft lighting.",
    "No people, hands, loose items, labels, letters, numbers, borders, scenery, duplicates, logos, or watermarks.",
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

      const adapter = new OpenRouterCharacterVisualGenerationAdapter({
        apiKey,
      });
      const storage = createCharacterVisualStorageAdapter();
      const authorizationPort = new WebManagedAssetAuthorizationAdapter();
      const batchId = crypto.randomUUID();
      const assets = [];
      const costMetadata = [];
      for (const [index, assetKind] of BAG_VARIANTS.entries()) {
        const generated = await adapter.generate({
          jobId: crypto.randomUUID(),
          brief: null as never,
          prompt: bagPrompt(input.characterName, assetKind),
          model: "krea/krea-2-medium-turbo",
          candidateCount: 1,
          aspectRatio: "1:1",
          resolution: "1K",
        });
        const candidate = generated.candidates[0];
        if (!candidate) throw new Error("BAG_IMAGE_EMPTY");
        const stored = await storage.store({
          householdId: input.householdId,
          characterId: input.characterId,
          jobId: batchId,
          candidateIndex: index,
          bytesBase64: candidate.bytesBase64,
          mimeType: candidate.mimeType,
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
            sourceSystem: "bag-direct-v1",
            provenance: {
              batchId,
              idempotencyKey: input.idempotencyKey,
              variant: assetKind,
              providerRequestId: generated.providerRequestId ?? null,
            },
          },
          { authorizationPort },
        );
        await selectManagedAssetCanon(parent.id, scope, asset.id, {
          authorizationPort,
        });
        assets.push(asset);
        if (generated.costMetadata) costMetadata.push(generated.costMetadata);
      }
      return NextResponse.json(
        { batchId, assets, costMetadata },
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
