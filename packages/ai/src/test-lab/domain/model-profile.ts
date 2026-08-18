export type PricingProvenance = "openrouter_catalog" | "manual_override";

export interface ModelPricingPerTokenUsd {
  prompt: number;
  completion: number;
  request: number;
  image: number;
  webSearch: number;
  internalReasoning: number;
  inputCacheRead: number;
  inputCacheWrite: number;
}

export interface ModelPricingPerMillionUsd {
  prompt: number;
  completion: number;
  internalReasoning: number;
  inputCacheRead: number;
  inputCacheWrite: number;
}

export interface ModelPricingSnapshot {
  source: PricingProvenance;
  currency: "USD";
  capturedAt: string;
  perTokenUsd: ModelPricingPerTokenUsd;
  perMillionUsd: ModelPricingPerMillionUsd;
}

export interface ModelProfile {
  provider: "openrouter";
  modelSlug: string;
  displayName: string | null;
  pricing: ModelPricingSnapshot;
}

export interface TestRunUsageSnapshot {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cachedInputTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
  estimatedCostUsd: number;
  actualCostUsd: number | null;
  upstreamInferenceCostUsd: number | null;
  latencyMs: number;
  retryCount: number;
}

export function pricingSnapshot(input: {
  source: PricingProvenance;
  capturedAt: string;
  perTokenUsd: ModelPricingPerTokenUsd;
}): ModelPricingSnapshot {
  return {
    source: input.source,
    currency: "USD",
    capturedAt: input.capturedAt,
    perTokenUsd: input.perTokenUsd,
    perMillionUsd: {
      prompt: perMillion(input.perTokenUsd.prompt),
      completion: perMillion(input.perTokenUsd.completion),
      internalReasoning: perMillion(input.perTokenUsd.internalReasoning),
      inputCacheRead: perMillion(input.perTokenUsd.inputCacheRead),
      inputCacheWrite: perMillion(input.perTokenUsd.inputCacheWrite),
    },
  };
}

export function estimateRunCostUsd(input: {
  pricing: ModelPricingSnapshot;
  promptTokens: number;
  completionTokens: number;
  cachedInputTokens?: number;
  cacheWriteTokens?: number;
  reasoningTokens?: number;
}): number {
  const cached = clampTokenCount(input.cachedInputTokens ?? 0, input.promptTokens);
  const cacheWrite = clampTokenCount(
    input.cacheWriteTokens ?? 0,
    Math.max(0, input.promptTokens - cached),
  );
  const regularPrompt = Math.max(0, input.promptTokens - cached - cacheWrite);

  const reasoning = clampTokenCount(
    input.reasoningTokens ?? 0,
    input.completionTokens,
  );
  const regularCompletion = Math.max(0, input.completionTokens - reasoning);
  const price = input.pricing.perTokenUsd;

  const cacheReadPrice = price.inputCacheRead || price.prompt;
  const cacheWritePrice = price.inputCacheWrite || price.prompt;
  const reasoningPrice = price.internalReasoning || price.completion;

  return roundUsd(
    regularPrompt * price.prompt +
      cached * cacheReadPrice +
      cacheWrite * cacheWritePrice +
      regularCompletion * price.completion +
      reasoning * reasoningPrice +
      price.request,
  );
}

function perMillion(value: number): number {
  return roundUsd(value * 1_000_000);
}

function clampTokenCount(value: number, upperBound: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(Math.floor(value), Math.max(0, Math.floor(upperBound)));
}

function roundUsd(value: number): number {
  return Math.round(value * 1_000_000_000) / 1_000_000_000;
}
