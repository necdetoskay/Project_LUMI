import type { ProviderUsage } from "../../domain/generation-types";

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

export class InvalidModelPricingError extends Error {
  constructor(field: keyof ModelPricingPerTokenUsd, value: number) {
    super(`INVALID_MODEL_PRICING:${field}:${String(value)}`);
    this.name = "InvalidModelPricingError";
  }
}

export function pricingSnapshot(input: {
  source: PricingProvenance;
  capturedAt: string;
  perTokenUsd: ModelPricingPerTokenUsd;
}): ModelPricingSnapshot {
  assertPricing(input.perTokenUsd);

  return {
    source: input.source,
    currency: "USD",
    capturedAt: input.capturedAt,
    perTokenUsd: { ...input.perTokenUsd },
    perMillionUsd: {
      prompt: perMillion(input.perTokenUsd.prompt),
      completion: perMillion(input.perTokenUsd.completion),
      internalReasoning: perMillion(input.perTokenUsd.internalReasoning),
      inputCacheRead: perMillion(input.perTokenUsd.inputCacheRead),
      inputCacheWrite: perMillion(input.perTokenUsd.inputCacheWrite),
    },
  };
}

export function createTestRunUsageSnapshot(input: {
  pricing: ModelPricingSnapshot;
  providerUsage: ProviderUsage;
  retryCount?: number;
}): TestRunUsageSnapshot {
  const usage = input.providerUsage;
  const cachedInputTokens = usage.cachedInputTokens ?? 0;
  const cacheWriteTokens = usage.cacheWriteTokens ?? 0;
  const reasoningTokens = usage.reasoningTokens ?? 0;

  return {
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    cachedInputTokens,
    cacheWriteTokens,
    reasoningTokens,
    estimatedCostUsd: estimateRunCostUsd({
      pricing: input.pricing,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      cachedInputTokens,
      cacheWriteTokens,
      reasoningTokens,
    }),
    actualCostUsd: finiteNonNegativeOrNull(usage.actualCostUsd),
    upstreamInferenceCostUsd: finiteNonNegativeOrNull(
      usage.upstreamInferenceCostUsd,
    ),
    latencyMs: Math.max(0, Math.floor(usage.latencyMs)),
    retryCount: Math.max(0, Math.floor(input.retryCount ?? 0)),
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
  const cached = clampTokenCount(
    input.cachedInputTokens ?? 0,
    input.promptTokens,
  );
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

  return roundUsd(
    regularPrompt * price.prompt +
      cached * price.inputCacheRead +
      cacheWrite * price.inputCacheWrite +
      regularCompletion * price.completion +
      reasoning * price.internalReasoning +
      price.request,
  );
}

function assertPricing(pricing: ModelPricingPerTokenUsd): void {
  for (const [field, value] of Object.entries(pricing) as Array<
    [keyof ModelPricingPerTokenUsd, number]
  >) {
    if (!Number.isFinite(value) || value < 0) {
      throw new InvalidModelPricingError(field, value);
    }
  }
}

function finiteNonNegativeOrNull(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
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
