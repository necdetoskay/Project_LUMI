import type { ProviderUsage } from "../domain/generation-types";

export const PRICE_PER_1M_INPUT_TOKENS_USD = 0.25;
export const PRICE_PER_1M_OUTPUT_TOKENS_USD = 1.25;

export function estimateCostUsd(usage: {
  promptTokens: number;
  completionTokens: number;
}): number {
  const inputCost =
    (usage.promptTokens / 1_000_000) * PRICE_PER_1M_INPUT_TOKENS_USD;
  const outputCost =
    (usage.completionTokens / 1_000_000) * PRICE_PER_1M_OUTPUT_TOKENS_USD;
  return round6(inputCost + outputCost);
}

export function withCost(usage: Omit<ProviderUsage, "costUsd">): ProviderUsage {
  return {
    ...usage,
    costUsd: estimateCostUsd(usage),
  };
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
