import {
  pricingSnapshot,
  type ModelPricingPerTokenUsd,
  type ModelProfile,
  type PricingProvenance,
} from "../domain/model-profile";

export class OpenRouterModelNotFoundError extends Error {
  constructor(modelSlug: string) {
    super(`OPENROUTER_MODEL_NOT_FOUND:${modelSlug}`);
    this.name = "OpenRouterModelNotFoundError";
  }
}

export class OpenRouterPricingUnavailableError extends Error {
  constructor(modelSlug: string) {
    super(`OPENROUTER_PRICING_UNAVAILABLE:${modelSlug}`);
    this.name = "OpenRouterPricingUnavailableError";
  }
}

interface OpenRouterCatalogResponse {
  data?: OpenRouterCatalogModel[];
}

interface OpenRouterCatalogModel {
  id?: string;
  name?: string;
  pricing?: Record<string, string | number | null | undefined>;
}

export interface OpenRouterModelCatalogConfig {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class OpenRouterModelCatalog {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: OpenRouterModelCatalogConfig = {}) {
    this.baseUrl = config.baseUrl ?? "https://openrouter.ai/api/v1";
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async resolveModelProfile(input: {
    modelSlug: string;
    capturedAt: string;
    manualPricing?: Partial<ModelPricingPerTokenUsd>;
  }): Promise<ModelProfile> {
    const model = await this.findExactModel(input.modelSlug);
    const catalogPricing = parsePricing(model.pricing, input.modelSlug);

    const source: PricingProvenance = input.manualPricing
      ? "manual_override"
      : "openrouter_catalog";
    const perTokenUsd = input.manualPricing
      ? { ...catalogPricing, ...input.manualPricing }
      : catalogPricing;

    return {
      provider: "openrouter",
      modelSlug: input.modelSlug,
      displayName: model.name ?? null,
      pricing: pricingSnapshot({
        source,
        capturedAt: input.capturedAt,
        perTokenUsd,
      }),
    };
  }

  private async findExactModel(modelSlug: string): Promise<OpenRouterCatalogModel> {
    const response = await this.fetchImpl(`${this.baseUrl}/models`);
    if (!response.ok) {
      throw new Error(`OPENROUTER_MODELS_REQUEST_FAILED:${response.status}`);
    }

    const payload = (await response.json()) as OpenRouterCatalogResponse;
    const model = payload.data?.find((candidate) => candidate.id === modelSlug);
    if (!model) throw new OpenRouterModelNotFoundError(modelSlug);
    return model;
  }
}

function parsePricing(
  pricing: OpenRouterCatalogModel["pricing"],
  modelSlug: string,
): ModelPricingPerTokenUsd {
  if (!pricing) throw new OpenRouterPricingUnavailableError(modelSlug);

  const prompt = parseNonNegative(pricing.prompt);
  const completion = parseNonNegative(pricing.completion);
  if (prompt === null || completion === null) {
    throw new OpenRouterPricingUnavailableError(modelSlug);
  }

  return {
    prompt,
    completion,
    request: parseNonNegative(pricing.request) ?? 0,
    image: parseNonNegative(pricing.image) ?? 0,
    webSearch: parseNonNegative(pricing.web_search) ?? 0,
    internalReasoning: parseNonNegative(pricing.internal_reasoning) ?? 0,
    inputCacheRead: parseNonNegative(pricing.input_cache_read) ?? 0,
    inputCacheWrite: parseNonNegative(pricing.input_cache_write) ?? 0,
  };
}

function parseNonNegative(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}
