import { describe, expect, it } from "vitest";

import {
  createTestRunUsageSnapshot,
  estimateRunCostUsd,
  InvalidModelPricingError,
  pricingSnapshot,
} from "../src/test-lab/domain/model-profile";
import {
  OpenRouterModelCatalog,
  OpenRouterModelNotFoundError,
  OpenRouterPricingUnavailableError,
} from "../src/test-lab/infrastructure/openrouter-model-catalog";

const capturedAt = "2026-08-18T08:30:00.000Z";

describe("Test Lab model pricing", () => {
  it("normalizes OpenRouter per-token pricing to per-million UI values", async () => {
    const catalog = new OpenRouterModelCatalog({
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            data: [
              {
                id: "vendor/model-a",
                name: "Model A",
                pricing: {
                  prompt: "0.00000025",
                  completion: "0.00000125",
                  input_cache_read: "0.000000025",
                  input_cache_write: "0.00000025",
                },
              },
            ],
          }),
          { status: 200 },
        ),
    });

    const profile = await catalog.resolveModelProfile({
      modelSlug: "vendor/model-a",
      capturedAt,
    });

    expect(profile.modelSlug).toBe("vendor/model-a");
    expect(profile.pricing.source).toBe("openrouter_catalog");
    expect(profile.pricing.perMillionUsd.prompt).toBe(0.25);
    expect(profile.pricing.perMillionUsd.completion).toBe(1.25);
    expect(profile.pricing.perMillionUsd.inputCacheRead).toBe(0.025);
    expect(profile.pricing.perMillionUsd.internalReasoning).toBe(1.25);
  });

  it("never silently substitutes an unresolved model slug", async () => {
    const catalog = new OpenRouterModelCatalog({
      fetchImpl: async () =>
        new Response(JSON.stringify({ data: [{ id: "vendor/other" }] }), {
          status: 200,
        }),
    });

    await expect(
      catalog.resolveModelProfile({
        modelSlug: "vendor/missing",
        capturedAt,
      }),
    ).rejects.toBeInstanceOf(OpenRouterModelNotFoundError);
  });

  it("fails when traceable prompt/completion pricing is unavailable", async () => {
    const catalog = new OpenRouterModelCatalog({
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            data: [{ id: "vendor/model-a", pricing: { prompt: "0.000001" } }],
          }),
          { status: 200 },
        ),
    });

    await expect(
      catalog.resolveModelProfile({
        modelSlug: "vendor/model-a",
        capturedAt,
      }),
    ).rejects.toBeInstanceOf(OpenRouterPricingUnavailableError);
  });

  it("marks manual price changes with explicit provenance", async () => {
    const catalog = new OpenRouterModelCatalog({
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            data: [
              {
                id: "vendor/model-a",
                pricing: { prompt: "0.000001", completion: "0.000002" },
              },
            ],
          }),
          { status: 200 },
        ),
    });

    const profile = await catalog.resolveModelProfile({
      modelSlug: "vendor/model-a",
      capturedAt,
      manualPricing: { prompt: 0.0000005 },
    });

    expect(profile.pricing.source).toBe("manual_override");
    expect(profile.pricing.perMillionUsd.prompt).toBe(0.5);
    expect(profile.pricing.perMillionUsd.completion).toBe(2);
  });

  it("rejects invalid manual pricing instead of creating an untraceable run", async () => {
    const catalog = new OpenRouterModelCatalog({
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            data: [
              {
                id: "vendor/model-a",
                pricing: { prompt: "0.000001", completion: "0.000002" },
              },
            ],
          }),
          { status: 200 },
        ),
    });

    await expect(
      catalog.resolveModelProfile({
        modelSlug: "vendor/model-a",
        capturedAt,
        manualPricing: { prompt: -1 },
      }),
    ).rejects.toBeInstanceOf(InvalidModelPricingError);
  });

  it("estimates cache and reasoning-aware cost", () => {
    const pricing = pricingSnapshot({
      source: "openrouter_catalog",
      capturedAt,
      perTokenUsd: {
        prompt: 0.000001,
        completion: 0.000002,
        request: 0,
        image: 0,
        webSearch: 0,
        internalReasoning: 0.000003,
        inputCacheRead: 0.0000001,
        inputCacheWrite: 0.00000125,
      },
    });

    expect(
      estimateRunCostUsd({
        pricing,
        promptTokens: 1000,
        cachedInputTokens: 400,
        cacheWriteTokens: 100,
        completionTokens: 200,
        reasoningTokens: 50,
      }),
    ).toBe(0.001115);
  });

  it("preserves explicit zero specialized prices instead of falling back", async () => {
    const catalog = new OpenRouterModelCatalog({
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            data: [
              {
                id: "vendor/free-cache",
                pricing: {
                  prompt: "0.000001",
                  completion: "0.000002",
                  input_cache_read: "0",
                  internal_reasoning: "0",
                },
              },
            ],
          }),
          { status: 200 },
        ),
    });
    const profile = await catalog.resolveModelProfile({
      modelSlug: "vendor/free-cache",
      capturedAt,
    });

    expect(
      estimateRunCostUsd({
        pricing: profile.pricing,
        promptTokens: 100,
        cachedInputTokens: 100,
        completionTokens: 50,
        reasoningTokens: 50,
      }),
    ).toBe(0);
  });

  it("keeps estimated and provider-reported actual cost separate", () => {
    const pricing = pricingSnapshot({
      source: "openrouter_catalog",
      capturedAt,
      perTokenUsd: {
        prompt: 0.000001,
        completion: 0.000002,
        request: 0,
        image: 0,
        webSearch: 0,
        internalReasoning: 0.000002,
        inputCacheRead: 0.000001,
        inputCacheWrite: 0.000001,
      },
    });

    const usage = createTestRunUsageSnapshot({
      pricing,
      retryCount: 2,
      providerUsage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        latencyMs: 870,
        costUsd: 0.00023,
        actualCostUsd: 0.00023,
        upstreamInferenceCostUsd: 0.0002,
      },
    });

    expect(usage.estimatedCostUsd).toBe(0.0002);
    expect(usage.actualCostUsd).toBe(0.00023);
    expect(usage.upstreamInferenceCostUsd).toBe(0.0002);
    expect(usage.retryCount).toBe(2);
  });
});
