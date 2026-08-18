import { describe, expect, it } from "vitest";

import {
  estimateRunCostUsd,
  pricingSnapshot,
} from "../src/test-lab/domain/model-profile";
import {
  OpenRouterModelCatalog,
  OpenRouterModelNotFoundError,
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

  it("estimates cache and reasoning-aware cost without mixing it with actual cost", () => {
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
});
