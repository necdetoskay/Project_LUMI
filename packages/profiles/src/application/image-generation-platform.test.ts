import { describe, expect, it } from "vitest";

import {
  createGridCropPlan,
  createGridLayout,
  planImageGeneration,
  selectImageGenerationCapability,
  type ImageGenerationBudgetPolicy,
  type ImageGenerationModelCapabilities,
} from "./image-generation-platform";

const policy: ImageGenerationBudgetPolicy = {
  runtimeMaxJobCostUsd: 0.1,
  liveTestMaxJobCostUsd: 0.03,
  minimumGridSavingsRatio: 0.2,
  allowUnknownPricing: false,
};

const krea: ImageGenerationModelCapabilities = {
  provider: "openrouter",
  model: "krea/krea-2-medium-turbo",
  supportedAspectRatios: ["1:1", "4:3"],
  supportedResolutions: ["1K"],
  maxImagesPerRequest: 1,
  supportsNativeBatch: false,
  supportsGrid: true,
  maxGridCells: 4,
  pricing: {
    currency: "USD",
    perProviderRequestUsd: 0.015,
    pricingBasis: "s56-test-fixture",
  },
};

describe("image generation platform planning", () => {
  it("plans direct fan-out for a one-image-per-request provider", () => {
    const plan = planImageGeneration(
      krea,
      {
        candidateCount: 3,
        aspectRatio: "1:1",
        resolution: "1K",
        requestMaxCostUsd: 0.1,
      },
      policy,
    );

    expect(plan.strategy).toBe("direct");
    expect(plan.providerRequestCount).toBe(3);
    expect(plan.estimatedCostUsd).toBe(0.045);
  });

  it("selects native batch when a provider can return all candidates in one request", () => {
    const capability: ImageGenerationModelCapabilities = {
      ...krea,
      model: "native-batch-fixture",
      supportsNativeBatch: true,
      supportsGrid: false,
      maxImagesPerRequest: 4,
      pricing: {
        currency: "USD",
        perProviderRequestUsd: 0.02,
        pricingBasis: "native-batch-fixture",
      },
    };

    const plan = planImageGeneration(
      capability,
      {
        candidateCount: 4,
        aspectRatio: "1:1",
        resolution: "1K",
        requestMaxCostUsd: 0.1,
      },
      policy,
    );

    expect(plan.strategy).toBe("native_batch");
    expect(plan.providerRequestCount).toBe(1);
    expect(plan.estimatedCostUsd).toBe(0.02);
  });

  it("uses a grid only when the configured savings threshold is met", () => {
    const plan = planImageGeneration(
      krea,
      {
        candidateCount: 4,
        aspectRatio: "1:1",
        resolution: "1K",
        requestMaxCostUsd: 0.1,
        allowGrid: true,
      },
      policy,
    );

    expect(plan.strategy).toBe("grid");
    expect(plan.directEstimatedCostUsd).toBe(0.06);
    expect(plan.estimatedCostUsd).toBe(0.015);
    expect(plan.grid).toEqual(createGridLayout(4));
  });

  it("rejects a plan before provider execution when the budget cap is exceeded", () => {
    expect(() =>
      planImageGeneration(
        krea,
        {
          candidateCount: 4,
          aspectRatio: "1:1",
          resolution: "1K",
          requestMaxCostUsd: 0.02,
        },
        policy,
      ),
    ).toThrow("IMAGE_GENERATION_BUDGET_EXCEEDED");
  });

  it("applies the stricter live-test cap", () => {
    expect(() =>
      planImageGeneration(
        krea,
        {
          candidateCount: 3,
          aspectRatio: "1:1",
          resolution: "1K",
          requestMaxCostUsd: 0.1,
          liveTest: true,
        },
        policy,
      ),
    ).toThrow("IMAGE_GENERATION_BUDGET_EXCEEDED");
  });

  it("fails closed when pricing is unknown", () => {
    expect(() =>
      planImageGeneration(
        { ...krea, pricing: undefined },
        {
          candidateCount: 1,
          aspectRatio: "1:1",
          resolution: "1K",
          requestMaxCostUsd: 0.1,
        },
        policy,
      ),
    ).toThrow("IMAGE_GENERATION_PRICING_UNKNOWN");
  });

  it("produces exact deterministic crop coordinates for a 2x2 grid", () => {
    expect(createGridCropPlan(createGridLayout(4), 1024, 1024)).toEqual([
      { index: 0, left: 0, top: 0, width: 512, height: 512 },
      { index: 1, left: 512, top: 0, width: 512, height: 512 },
      { index: 2, left: 0, top: 512, width: 512, height: 512 },
      { index: 3, left: 512, top: 512, width: 512, height: 512 },
    ]);
  });

  it("chooses the cheapest eligible capability deterministically", () => {
    const expensive: ImageGenerationModelCapabilities = {
      ...krea,
      provider: "provider-b",
      model: "model-b",
      pricing: {
        currency: "USD",
        perProviderRequestUsd: 0.025,
        pricingBasis: "expensive",
      },
    };
    const selected = selectImageGenerationCapability(
      [expensive, krea],
      {
        candidateCount: 1,
        aspectRatio: "1:1",
        resolution: "1K",
        requestMaxCostUsd: 0.1,
      },
      policy,
    );

    expect(selected.capability.model).toBe("krea/krea-2-medium-turbo");
  });
});
