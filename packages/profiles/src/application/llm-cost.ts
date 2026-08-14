export interface LlmPricingSnapshot {
  currency: "USD";
  modelId: string;
  promptUsdPerMillionTokens?: number;
  completionUsdPerMillionTokens?: number;
  capturedAt: string;
}

export interface LlmUsageForCost {
  promptTokens: number | null;
  completionTokens: number | null;
}

export interface LlmCostEstimate {
  estimatedCostUsdMicros: number;
  costSource: "pricing_snapshot";
  pricingSnapshot: LlmPricingSnapshot;
}

export function estimateLlmCost(
  usage: LlmUsageForCost,
  pricing: LlmPricingSnapshot | null,
): LlmCostEstimate | null {
  if (!pricing) return null;
  if (usage.promptTokens === null || usage.completionTokens === null)
    return null;
  if (
    pricing.promptUsdPerMillionTokens === undefined ||
    pricing.completionUsdPerMillionTokens === undefined
  )
    return null;

  // USD-per-million-token pricing maps directly to USD micros:
  // tokens * (USD / 1,000,000 tokens) * 1,000,000 micros / USD.
  const micros =
    usage.promptTokens * pricing.promptUsdPerMillionTokens +
    usage.completionTokens * pricing.completionUsdPerMillionTokens;

  return {
    estimatedCostUsdMicros: Math.round(micros),
    costSource: "pricing_snapshot",
    pricingSnapshot: pricing,
  };
}
