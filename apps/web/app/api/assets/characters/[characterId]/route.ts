import { NextResponse } from "next/server";
import { z } from "zod";

import { withParent } from "@/lib/auth/with-parent";
import { createCharacterVisualStorageAdapter } from "@/lib/assets/character-visual-storage";
import {
  commitCharacterVisualPreview,
  getCharacterVisualCanon,
  getOpenRouterApiKey,
  getOwnedHousehold,
  listInventory,
  listCharacterVisualCandidates,
  deleteCharacterVisualVariant,
  previewCharacterVisualCandidates,
  rejectCharacterVisualCandidate,
  selectCharacterVisualCanon,
  selectCharacterVisualRepresentation,
} from "@lumi/profiles/application";
import { OpenRouterCharacterVisualGenerationAdapter } from "@lumi/profiles/adapters";

const paramsSchema = z.object({ characterId: z.string().uuid() });

const emotionKeysSchema = z
  .array(z.enum(["happy", "sad", "surprised", "scared"]))
  .min(1)
  .max(4);

const generatedCandidateSchema = z.object({
  index: z.number().int().min(0).max(3),
  bytesBase64: z.string().min(1),
  mimeType: z.string().min(1).max(120),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  providerMetadata: z.record(z.string(), z.unknown()).optional(),
});

const previewSchema = z.object({
  previewId: z.string().uuid(),
  visualBriefVersion: z.string().min(1).max(40),
  visualBriefFingerprint: z.string().min(1).max(128),
  provider: z.string().min(1).max(80),
  model: z.string().min(1).max(160),
  providerRequestId: z.string().min(1).max(200).optional(),
  candidates: z.array(generatedCandidateSchema).min(1).max(4),
  bagItems: z
    .array(z.object({ id: z.string().uuid(), displayName: z.string().min(1) }))
    .max(12)
    .optional(),
  usageMetadata: z.record(z.string(), z.unknown()).optional(),
  costMetadata: z.record(z.string(), z.unknown()).optional(),
});

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("generate"),
    candidateCount: z.number().int().min(1).max(4).default(1),
    aspectRatio: z
      .enum(["1:1", "4:3", "3:2", "16:9", "4:5", "2:3", "9:16"])
      .optional(),
    mode: z
      .enum(["portrait", "reference-sheet", "expression-sheet"])
      .default("reference-sheet"),
    bagItemIds: z.array(z.string().uuid()).max(12).default([]),
    emotionKeys: emotionKeysSchema.default([
      "happy",
      "sad",
      "surprised",
      "scared",
    ]),
  }),
  z.object({
    action: z.literal("commit"),
    idempotencyKey: z.string().min(1).max(160),
    aspectRatio: z
      .enum(["1:1", "4:3", "3:2", "16:9", "4:5", "2:3", "9:16"])
      .optional(),
    mode: z
      .enum(["portrait", "reference-sheet", "expression-sheet"])
      .default("reference-sheet"),
    bagItemIds: z.array(z.string().uuid()).max(12).default([]),
    emotionKeys: emotionKeysSchema.default([
      "happy",
      "sad",
      "surprised",
      "scared",
    ]),
    preview: previewSchema,
  }),
  z.object({ action: z.literal("select"), assetId: z.string().uuid() }),
  z.object({
    action: z.literal("selectRepresentation"),
    assetId: z.string().uuid(),
    role: z.enum(["full_body", "half_body"]),
  }),
  z.object({ action: z.literal("reject"), assetId: z.string().uuid() }),
  z.object({ action: z.literal("delete"), assetId: z.string().uuid() }),
]);

async function requireHousehold(parentId: string, householdId: string | null) {
  if (!householdId) {
    throw new Error("HOUSEHOLD_ID_REQUIRED");
  }
  const household = await getOwnedHousehold(parentId);
  if (!household || household.id !== householdId) {
    throw new Error("HOUSEHOLD_FORBIDDEN");
  }
  return householdId;
}

async function resolveBagItems(
  parentId: string,
  householdId: string,
  characterId: string,
  itemIds: string[],
) {
  if (itemIds.length === 0) return [];
  const inventory = await listInventory(
    parentId,
    householdId,
    "character",
    characterId,
  );
  const byId = new Map(inventory.map((item) => [item.id, item]));
  const selected = itemIds.map((id) => byId.get(id));
  if (selected.some((item) => !item)) throw new Error("BAG_ITEM_NOT_FOUND");
  return selected.map((item) => ({
    id: item!.id,
    displayName: item!.displayName,
  }));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ characterId: string }> },
) {
  return withParent(async (parent) => {
    try {
      const parsedParams = paramsSchema.parse(await params);
      const householdId = await requireHousehold(
        parent.id,
        new URL(request.url).searchParams.get("householdId"),
      );
      const [canon, candidates] = await Promise.all([
        getCharacterVisualCanon(
          parent.id,
          householdId,
          parsedParams.characterId,
        ),
        listCharacterVisualCandidates(
          parent.id,
          householdId,
          parsedParams.characterId,
        ),
      ]);
      return NextResponse.json({
        canon,
        candidates: candidates.filter(
          (candidate) => !candidate.sourceCompositeAssetId,
        ),
        variants: candidates.filter((candidate) =>
          Boolean(candidate.sourceCompositeAssetId),
        ),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "VISUAL_ASSET_ERROR";
      const status = message.includes("FORBIDDEN") ? 403 : 400;
      return NextResponse.json({ error: message }, { status });
    }
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ characterId: string }> },
) {
  return withParent(async (parent) => {
    try {
      const parsedParams = paramsSchema.parse(await params);
      const householdId = await requireHousehold(
        parent.id,
        new URL(request.url).searchParams.get("householdId"),
      );
      const action = actionSchema.parse(await request.json());

      if (action.action === "generate") {
        const apiKey = await getOpenRouterApiKey(parent.id, householdId);
        if (!apiKey) {
          return NextResponse.json(
            { error: "OPENROUTER_API_KEY_NOT_CONFIGURED" },
            { status: 409 },
          );
        }
        const bagItems = await resolveBagItems(
          parent.id,
          householdId,
          parsedParams.characterId,
          action.bagItemIds,
        );
        const preview = await previewCharacterVisualCandidates(
          parent.id,
          {
            householdId,
            characterId: parsedParams.characterId,
            candidateCount: action.candidateCount,
            ...(action.aspectRatio ? { aspectRatio: action.aspectRatio } : {}),
            mode: action.mode,
            model: "krea/krea-2-medium-turbo",
            ...(bagItems.length ? { bagItems } : {}),
            ...(action.emotionKeys.length
              ? { emotionKeys: action.emotionKeys }
              : {}),
          },
          {
            generationPort: new OpenRouterCharacterVisualGenerationAdapter({
              apiKey,
            }),
          },
        );
        return NextResponse.json({ preview }, { status: 201 });
      }

      if (action.action === "commit") {
        const { PureJsCharacterReferenceSheetDerivativeAdapter } = await import(
          "@/lib/assets/character-reference-sheet-derivative"
        );
        const bagItems = await resolveBagItems(
          parent.id,
          householdId,
          parsedParams.characterId,
          action.bagItemIds,
        );
        const preview = {
          previewId: action.preview.previewId,
          visualBriefVersion: action.preview.visualBriefVersion,
          visualBriefFingerprint: action.preview.visualBriefFingerprint,
          provider: action.preview.provider,
          model: action.preview.model,
          candidates: action.preview.candidates.map((candidate) => ({
            index: candidate.index,
            bytesBase64: candidate.bytesBase64,
            mimeType: candidate.mimeType,
            ...(typeof candidate.width === "number"
              ? { width: candidate.width }
              : {}),
            ...(typeof candidate.height === "number"
              ? { height: candidate.height }
              : {}),
            ...(candidate.providerMetadata
              ? { providerMetadata: candidate.providerMetadata }
              : {}),
          })),
          ...(bagItems.length ? { bagItems } : {}),
          ...(action.emotionKeys.length
            ? { emotionKeys: action.emotionKeys }
            : {}),
          ...(action.preview.providerRequestId
            ? { providerRequestId: action.preview.providerRequestId }
            : {}),
          ...(action.preview.usageMetadata
            ? { usageMetadata: action.preview.usageMetadata }
            : {}),
          ...(action.preview.costMetadata
            ? { costMetadata: action.preview.costMetadata }
            : {}),
        };
        const result = await commitCharacterVisualPreview(
          parent.id,
          {
            householdId,
            characterId: parsedParams.characterId,
            idempotencyKey: action.idempotencyKey,
            preview,
            ...(bagItems.length ? { bagItems } : {}),
            ...(action.emotionKeys.length
              ? { emotionKeys: action.emotionKeys }
              : {}),
            ...(action.aspectRatio ? { aspectRatio: action.aspectRatio } : {}),
            mode: action.mode,
          },
          {
            storagePort: createCharacterVisualStorageAdapter(),
            derivativePort:
              new PureJsCharacterReferenceSheetDerivativeAdapter(),
          },
        );
        return NextResponse.json(result, {
          status: result.replayed ? 200 : 201,
        });
      }

      if (action.action === "select") {
        const canon = await selectCharacterVisualCanon(
          parent.id,
          householdId,
          parsedParams.characterId,
          action.assetId,
        );
        return NextResponse.json({ canon });
      }

      if (action.action === "selectRepresentation") {
        const canon = await selectCharacterVisualRepresentation(
          parent.id,
          householdId,
          parsedParams.characterId,
          action.role,
          action.assetId,
        );
        return NextResponse.json({ canon });
      }

      if (action.action === "delete") {
        const candidate = await deleteCharacterVisualVariant(
          parent.id,
          householdId,
          parsedParams.characterId,
          action.assetId,
        );
        return NextResponse.json({ candidate });
      }

      const candidate = await rejectCharacterVisualCandidate(
        parent.id,
        householdId,
        parsedParams.characterId,
        action.assetId,
      );
      return NextResponse.json({ candidate });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "VISUAL_ASSET_ERROR";
      const status = message.includes("FORBIDDEN") ? 403 : 400;
      return NextResponse.json({ error: message }, { status });
    }
  });
}
