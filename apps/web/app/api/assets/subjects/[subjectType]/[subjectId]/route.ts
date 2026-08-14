import { NextResponse } from "next/server";
import { z } from "zod";

import { WebManagedAssetAuthorizationAdapter } from "@/lib/assets/managed-asset-authorization";
import { createManagedImageStorageAdapter } from "@/lib/assets/managed-image-storage";
import { withParent } from "@/lib/auth/with-parent";
import {
  generateManagedImageCandidates,
  getManagedAssetCanon,
  getOpenRouterApiKey,
  listManagedAssets,
  selectManagedAssetCanon,
  type ImageGenerationBudgetPolicy,
} from "@lumi/profiles/application";
import { OpenRouterImageGenerationAdapter } from "@lumi/profiles/adapters";

const paramsSchema = z.object({
  subjectType: z.enum(["character", "npc", "location", "item", "story_scene"]),
  subjectId: z.string().uuid(),
});

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("select"),
    assetId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("generate"),
    assetKind: z.string().min(1).max(64),
    idempotencyKey: z.string().min(1).max(160),
    prompt: z.string().min(1).max(12000),
    candidateCount: z.number().int().min(1).max(4).default(1),
    aspectRatio: z
      .enum(["1:1", "4:3", "3:2", "16:9", "4:5", "2:3", "9:16"])
      .default("1:1"),
    requestMaxCostUsd: z.number().min(0).max(1).default(0.1),
    allowGrid: z.boolean().default(false),
  }),
]);

function numericEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function budgetPolicyFromEnv(): ImageGenerationBudgetPolicy {
  const gridSavings = numericEnv(
    "IMAGE_GENERATION_MIN_GRID_SAVINGS_RATIO",
    0.2,
  );
  return {
    runtimeMaxJobCostUsd: numericEnv("IMAGE_GENERATION_MAX_JOB_COST_USD", 0.1),
    liveTestMaxJobCostUsd: numericEnv(
      "IMAGE_GENERATION_LIVE_TEST_MAX_JOB_COST_USD",
      0.03,
    ),
    minimumGridSavingsRatio:
      gridSavings >= 0 && gridSavings < 1 ? gridSavings : 0.2,
    allowUnknownPricing: false,
  };
}

function errorStatus(message: string) {
  return message.includes("FORBIDDEN")
    ? 403
    : message.includes("NOT_FOUND")
      ? 404
      : message.includes("RESOLVER_NOT_AVAILABLE")
        ? 501
        : message.includes("API_KEY_NOT_CONFIGURED")
          ? 409
          : message.includes("BUDGET") || message.includes("PRICING")
            ? 422
            : 400;
}

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ subjectType: string; subjectId: string }>;
  },
) {
  return withParent(async (parent) => {
    try {
      const parsed = paramsSchema.parse(await params);
      const url = new URL(request.url);
      const householdId = url.searchParams.get("householdId");
      if (!householdId) {
        return NextResponse.json(
          { error: "HOUSEHOLD_ID_REQUIRED" },
          { status: 400 },
        );
      }
      const assetKind = url.searchParams.get("assetKind");
      const scope = {
        householdId,
        subjectType: parsed.subjectType,
        subjectId: parsed.subjectId,
      };
      const deps = {
        authorizationPort: new WebManagedAssetAuthorizationAdapter(),
      };
      const [assets, canon] = await Promise.all([
        listManagedAssets(parent.id, scope, deps),
        assetKind
          ? getManagedAssetCanon(parent.id, scope, assetKind, deps)
          : Promise.resolve(null),
      ]);
      return NextResponse.json({
        subject: {
          type: parsed.subjectType,
          id: parsed.subjectId,
        },
        assets,
        canon,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "MANAGED_ASSET_ERROR";
      return NextResponse.json(
        { error: message },
        { status: errorStatus(message) },
      );
    }
  });
}

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ subjectType: string; subjectId: string }>;
  },
) {
  return withParent(async (parent) => {
    try {
      const parsed = paramsSchema.parse(await params);
      const householdId = new URL(request.url).searchParams.get("householdId");
      if (!householdId) {
        return NextResponse.json(
          { error: "HOUSEHOLD_ID_REQUIRED" },
          { status: 400 },
        );
      }
      const action = actionSchema.parse(await request.json());
      const authorizationPort = new WebManagedAssetAuthorizationAdapter();

      if (action.action === "select") {
        const canon = await selectManagedAssetCanon(
          parent.id,
          {
            householdId,
            subjectType: parsed.subjectType,
            subjectId: parsed.subjectId,
          },
          action.assetId,
          { authorizationPort },
        );
        return NextResponse.json({ canon });
      }

      const apiKey = await getOpenRouterApiKey(parent.id, householdId);
      if (!apiKey) {
        return NextResponse.json(
          { error: "OPENROUTER_API_KEY_NOT_CONFIGURED" },
          { status: 409 },
        );
      }

      const result = await generateManagedImageCandidates(
        parent.id,
        {
          householdId,
          subjectType: parsed.subjectType,
          subjectId: parsed.subjectId,
          assetKind: action.assetKind,
          idempotencyKey: action.idempotencyKey,
          prompt: action.prompt,
          candidateCount: action.candidateCount,
          aspectRatio: action.aspectRatio,
          requestMaxCostUsd: action.requestMaxCostUsd,
          preferredProvider: "openrouter",
          preferredModel: "krea/krea-2-medium-turbo",
          allowGrid: action.allowGrid,
        },
        {
          authorizationPort,
          providers: [new OpenRouterImageGenerationAdapter({ apiKey })],
          storagePort: createManagedImageStorageAdapter(),
          budgetPolicy: budgetPolicyFromEnv(),
          // Grid stays runtime-disabled until a deterministic binary splitter is
          // composed. The service automatically falls back to direct planning.
        },
      );

      return NextResponse.json(result, {
        status: result.replayed ? 200 : 201,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "MANAGED_ASSET_ERROR";
      return NextResponse.json(
        { error: message },
        { status: errorStatus(message) },
      );
    }
  });
}
