import { describe, expect, it } from "vitest";
import { estimateLlmCost } from "./llm-cost";

describe("estimateLlmCost", () => {
  it("returns null without a pricing snapshot", () => {
    expect(
      estimateLlmCost({ promptTokens: 100, completionTokens: 50 }, null),
    ).toBeNull();
  });

  it("returns null when usage is incomplete", () => {
    expect(
      estimateLlmCost(
        { promptTokens: null, completionTokens: 50 },
        {
          currency: "USD",
          modelId: "provider/model",
          promptUsdPerMillionTokens: 0.1,
          completionUsdPerMillionTokens: 0.2,
          capturedAt: "2026-08-14T00:00:00.000Z",
        },
      ),
    ).toBeNull();
  });

  it("stores the estimate in USD micros with its immutable snapshot", () => {
    const pricing = {
      currency: "USD" as const,
      modelId: "provider/model",
      promptUsdPerMillionTokens: 0.1,
      completionUsdPerMillionTokens: 0.2,
      capturedAt: "2026-08-14T00:00:00.000Z",
    };

    expect(
      estimateLlmCost(
        { promptTokens: 1_000_000, completionTokens: 500_000 },
        pricing,
      ),
    ).toEqual({
      estimatedCostUsdMicros: 200_000,
      costSource: "pricing_snapshot",
      pricingSnapshot: pricing,
    });
  });
});
