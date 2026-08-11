import { NextResponse } from "next/server";
import { z } from "zod";

import { withParent } from "@/lib/auth/with-parent";
import { createCharacterVisualStorageAdapter } from "@/lib/assets/character-visual-storage";
import {
  generateCharacterVisualCandidates,
  getCharacterVisualCanon,
  getOpenRouterApiKey,
  getOwnedHousehold,
  listCharacterVisualCandidates,
  rejectCharacterVisualCandidate,
  selectCharacterVisualCanon,
} from "@lumi/profiles/application";
import { OpenRouterCharacterVisualGenerationAdapter } from "@lumi/profiles/adapters";

const paramsSchema = z.object({ characterId: z.string().uuid() });

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("generate"),
    idempotencyKey: z.string().min(1).max(160),
    candidateCount: z.number().int().min(1).max(4).default(1),
    aspectRatio: z
      .enum(["1:1", "4:3", "3:2", "16:9", "4:5", "2:3", "9:16"])
      .optional(),
    mode: z.enum(["portrait", "reference-sheet"]).default("reference-sheet"),
  }),
  z.object({ action: z.literal("select"), assetId: z.string().uuid() }),
  z.object({ action: z.literal("reject"), assetId: z.string().uuid() }),
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
        const { PureJsCharacterReferenceSheetDerivativeAdapter } = await import(
          "@/lib/assets/character-reference-sheet-derivative"
        );
        const apiKey = await getOpenRouterApiKey(parent.id, householdId);
        if (!apiKey) {
          return NextResponse.json(
            { error: "OPENROUTER_API_KEY_NOT_CONFIGURED" },
            { status: 409 },
          );
        }
        const result = await generateCharacterVisualCandidates(
          parent.id,
          {
            householdId,
            characterId: parsedParams.characterId,
            idempotencyKey: action.idempotencyKey,
            candidateCount: action.candidateCount,
            ...(action.aspectRatio ? { aspectRatio: action.aspectRatio } : {}),
            mode: action.mode,
            model: "krea/krea-2-medium-turbo",
          },
          {
            generationPort: new OpenRouterCharacterVisualGenerationAdapter({
              apiKey,
            }),
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
