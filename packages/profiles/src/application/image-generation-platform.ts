import type { ManagedAssetSubjectType } from "./managed-asset.service";

export const IMAGE_ASPECT_RATIOS = [
  "1:1",
  "4:3",
  "3:2",
  "16:9",
  "4:5",
  "2:3",
  "9:16",
] as const;

export type ImageAspectRatio = (typeof IMAGE_ASPECT_RATIOS)[number];
export type ImageResolution = "1K";
export type ImageGenerationStrategy = "direct" | "native_batch" | "grid";

export type ImageGenerationSubject = {
  householdId: string;
  subjectType: ManagedAssetSubjectType;
  subjectId: string;
  assetKind: string;
};

export type ImagePricing = {
  currency: "USD";
  perProviderRequestUsd?: number;
  perImageUsd?: number;
  pricingBasis: string;
};

export type ImageGenerationModelCapabilities = {
  provider: string;
  model: string;
  supportedAspectRatios: readonly ImageAspectRatio[];
  supportedResolutions: readonly ImageResolution[];
  maxImagesPerRequest: number;
  supportsNativeBatch: boolean;
  supportsGrid: boolean;
  maxGridCells?: number;
  pricing?: ImagePricing;
};

export type ImageGenerationProviderRequest = {
  jobId: string;
  prompt: string;
  model: string;
  candidateCount: number;
  aspectRatio: ImageAspectRatio;
  resolution: ImageResolution;
  strategy: ImageGenerationStrategy;
  grid?: GridLayout;
};

export type GeneratedImage = {
  index: number;
  bytesBase64: string;
  mimeType: string;
  width?: number;
  height?: number;
  providerMetadata?: Record<string, unknown>;
};

export type ImageGenerationProviderResult = {
  provider: string;
  model: string;
  providerRequestId?: string;
  images: GeneratedImage[];
  usageMetadata?: Record<string, unknown>;
  actualCostUsd?: number;
  costMetadata?: Record<string, unknown>;
};

export interface ImageGenerationProviderPort {
  readonly capabilities: readonly ImageGenerationModelCapabilities[];
  generate(
    request: ImageGenerationProviderRequest,
  ): Promise<ImageGenerationProviderResult>;
}

export type ImageGenerationBudgetPolicy = {
  runtimeMaxJobCostUsd: number;
  liveTestMaxJobCostUsd: number;
  minimumGridSavingsRatio: number;
  allowUnknownPricing: boolean;
};

export type ImageGenerationPlanInput = {
  candidateCount: number;
  aspectRatio: ImageAspectRatio;
  resolution: ImageResolution;
  requestMaxCostUsd: number;
  liveTest?: boolean;
  allowGrid?: boolean;
};

export type GridCell = {
  index: number;
  row: number;
  column: number;
};

export type GridLayout = {
  rows: number;
  columns: number;
  cells: GridCell[];
};

export type ImageGenerationPlan = {
  strategy: ImageGenerationStrategy;
  provider: string;
  model: string;
  candidateCount: number;
  providerRequestCount: number;
  imagesPerProviderRequest: number;
  estimatedCostUsd: number;
  directEstimatedCostUsd: number;
  budgetCapUsd: number;
  grid?: GridLayout;
  pricingBasis: string;
};

const DEFAULT_GRID_LAYOUTS: Record<number, readonly [number, number]> = {
  2: [1, 2],
  4: [2, 2],
};

function roundUsd(value: number): number {
  return Number(value.toFixed(6));
}

function assertCandidateCount(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 4) {
    throw new Error("IMAGE_GENERATION_CANDIDATE_COUNT_INVALID");
  }
}

export function createGridLayout(candidateCount: number): GridLayout {
  assertCandidateCount(candidateCount);
  const dimensions = DEFAULT_GRID_LAYOUTS[candidateCount];
  if (!dimensions) throw new Error("IMAGE_GENERATION_GRID_LAYOUT_UNSUPPORTED");
  const [rows, columns] = dimensions;
  const cells: GridCell[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      cells.push({ index: cells.length, row, column });
    }
  }
  return { rows, columns, cells };
}

export function createGridCropPlan(
  layout: GridLayout,
  width: number,
  height: number,
) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width % layout.columns !== 0 ||
    height % layout.rows !== 0
  ) {
    throw new Error("IMAGE_GENERATION_GRID_DIMENSIONS_NOT_DIVISIBLE");
  }
  const cellWidth = width / layout.columns;
  const cellHeight = height / layout.rows;
  return layout.cells.map((cell) => ({
    index: cell.index,
    left: cell.column * cellWidth,
    top: cell.row * cellHeight,
    width: cellWidth,
    height: cellHeight,
  }));
}

function estimateCostUsd(
  capability: ImageGenerationModelCapabilities,
  providerRequestCount: number,
  candidateCount: number,
): { total: number; pricingBasis: string } {
  const pricing = capability.pricing;
  if (!pricing) {
    return { total: Number.NaN, pricingBasis: "unknown" };
  }
  const requestCost =
    (pricing.perProviderRequestUsd ?? 0) * providerRequestCount;
  const imageCost = (pricing.perImageUsd ?? 0) * candidateCount;
  return {
    total: roundUsd(requestCost + imageCost),
    pricingBasis: pricing.pricingBasis,
  };
}

function budgetCap(
  input: ImageGenerationPlanInput,
  policy: ImageGenerationBudgetPolicy,
) {
  const policyCap = input.liveTest
    ? Math.min(policy.runtimeMaxJobCostUsd, policy.liveTestMaxJobCostUsd)
    : policy.runtimeMaxJobCostUsd;
  return Math.min(input.requestMaxCostUsd, policyCap);
}

function assertCapabilitySupports(
  capability: ImageGenerationModelCapabilities,
  input: ImageGenerationPlanInput,
) {
  if (!capability.supportedAspectRatios.includes(input.aspectRatio)) {
    throw new Error("IMAGE_GENERATION_ASPECT_RATIO_UNSUPPORTED");
  }
  if (!capability.supportedResolutions.includes(input.resolution)) {
    throw new Error("IMAGE_GENERATION_RESOLUTION_UNSUPPORTED");
  }
}

export function planImageGeneration(
  capability: ImageGenerationModelCapabilities,
  input: ImageGenerationPlanInput,
  policy: ImageGenerationBudgetPolicy,
): ImageGenerationPlan {
  assertCandidateCount(input.candidateCount);
  assertCapabilitySupports(capability, input);
  if (
    !Number.isFinite(input.requestMaxCostUsd) ||
    input.requestMaxCostUsd < 0 ||
    !Number.isFinite(policy.runtimeMaxJobCostUsd) ||
    policy.runtimeMaxJobCostUsd < 0 ||
    !Number.isFinite(policy.liveTestMaxJobCostUsd) ||
    policy.liveTestMaxJobCostUsd < 0 ||
    policy.minimumGridSavingsRatio < 0 ||
    policy.minimumGridSavingsRatio >= 1
  ) {
    throw new Error("IMAGE_GENERATION_BUDGET_POLICY_INVALID");
  }

  const directImagesPerRequest = capability.supportsNativeBatch
    ? Math.max(
        1,
        Math.min(capability.maxImagesPerRequest, input.candidateCount),
      )
    : 1;
  const directRequestCount = Math.ceil(
    input.candidateCount / directImagesPerRequest,
  );
  const direct = estimateCostUsd(
    capability,
    directRequestCount,
    input.candidateCount,
  );

  if (Number.isNaN(direct.total) && !policy.allowUnknownPricing) {
    throw new Error("IMAGE_GENERATION_PRICING_UNKNOWN");
  }

  let strategy: ImageGenerationStrategy =
    capability.supportsNativeBatch && directRequestCount === 1
      ? "native_batch"
      : "direct";
  let providerRequestCount = directRequestCount;
  let imagesPerProviderRequest = directImagesPerRequest;
  let estimatedCostUsd = direct.total;
  let grid: GridLayout | undefined;

  if (
    input.allowGrid &&
    capability.supportsGrid &&
    (capability.maxGridCells ?? 0) >= input.candidateCount &&
    DEFAULT_GRID_LAYOUTS[input.candidateCount]
  ) {
    const gridEstimate = estimateCostUsd(capability, 1, 1);
    if (!Number.isNaN(gridEstimate.total) && !Number.isNaN(direct.total)) {
      const requiredMax = direct.total * (1 - policy.minimumGridSavingsRatio);
      if (gridEstimate.total <= requiredMax) {
        strategy = "grid";
        providerRequestCount = 1;
        imagesPerProviderRequest = input.candidateCount;
        estimatedCostUsd = gridEstimate.total;
        grid = createGridLayout(input.candidateCount);
      }
    }
  }

  const cap = budgetCap(input, policy);
  if (!Number.isNaN(estimatedCostUsd) && estimatedCostUsd > cap) {
    throw new Error("IMAGE_GENERATION_BUDGET_EXCEEDED");
  }

  return {
    strategy,
    provider: capability.provider,
    model: capability.model,
    candidateCount: input.candidateCount,
    providerRequestCount,
    imagesPerProviderRequest,
    estimatedCostUsd,
    directEstimatedCostUsd: direct.total,
    budgetCapUsd: cap,
    ...(grid ? { grid } : {}),
    pricingBasis: capability.pricing?.pricingBasis ?? "unknown",
  };
}

export function selectImageGenerationCapability(
  capabilities: readonly ImageGenerationModelCapabilities[],
  input: ImageGenerationPlanInput,
  policy: ImageGenerationBudgetPolicy,
  preference?: { provider?: string; model?: string },
) {
  const candidates = capabilities.filter((capability) => {
    if (preference?.provider && capability.provider !== preference.provider) {
      return false;
    }
    if (preference?.model && capability.model !== preference.model)
      return false;
    return (
      capability.supportedAspectRatios.includes(input.aspectRatio) &&
      capability.supportedResolutions.includes(input.resolution)
    );
  });
  if (candidates.length === 0) {
    throw new Error("IMAGE_GENERATION_CAPABILITY_NOT_FOUND");
  }

  const planned = candidates
    .map((capability) => {
      try {
        return {
          capability,
          plan: planImageGeneration(capability, input, policy),
        };
      } catch (error) {
        if (
          error instanceof Error &&
          [
            "IMAGE_GENERATION_PRICING_UNKNOWN",
            "IMAGE_GENERATION_BUDGET_EXCEEDED",
          ].includes(error.message)
        ) {
          return null;
        }
        throw error;
      }
    })
    .filter(
      (
        value,
      ): value is {
        capability: ImageGenerationModelCapabilities;
        plan: ImageGenerationPlan;
      } => value !== null,
    );

  if (planned.length === 0) {
    throw new Error("IMAGE_GENERATION_NO_ELIGIBLE_PLAN");
  }

  planned.sort((left, right) => {
    const leftCost = Number.isNaN(left.plan.estimatedCostUsd)
      ? Number.POSITIVE_INFINITY
      : left.plan.estimatedCostUsd;
    const rightCost = Number.isNaN(right.plan.estimatedCostUsd)
      ? Number.POSITIVE_INFINITY
      : right.plan.estimatedCostUsd;
    if (leftCost !== rightCost) return leftCost - rightCost;
    return `${left.capability.provider}/${left.capability.model}`.localeCompare(
      `${right.capability.provider}/${right.capability.model}`,
    );
  });
  return planned[0]!;
}
