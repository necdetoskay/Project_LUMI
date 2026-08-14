import type { LlmPricingSnapshot } from "./llm-cost";

interface OpenRouterModel {
  id?: unknown;
  pricing?: {
    prompt?: unknown;
    completion?: unknown;
  };
}

interface OpenRouterModelsResponse {
  data?: OpenRouterModel[];
}

function tokenPriceToPerMillion(value: unknown): number | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const perToken = Number(value);
  if (!Number.isFinite(perToken) || perToken < 0) return undefined;
  return perToken * 1_000_000;
}

export async function resolveOpenRouterPricingSnapshot(
  modelId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LlmPricingSnapshot | null> {
  try {
    const response = await fetchImpl("https://openrouter.ai/api/v1/models", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as OpenRouterModelsResponse;
    const model = payload.data?.find((candidate) => candidate.id === modelId);
    if (!model) return null;

    const promptUsdPerMillionTokens = tokenPriceToPerMillion(
      model.pricing?.prompt,
    );
    const completionUsdPerMillionTokens = tokenPriceToPerMillion(
      model.pricing?.completion,
    );
    if (
      promptUsdPerMillionTokens === undefined ||
      completionUsdPerMillionTokens === undefined
    )
      return null;

    return {
      currency: "USD",
      modelId,
      promptUsdPerMillionTokens,
      completionUsdPerMillionTokens,
      capturedAt: new Date().toISOString(),
    };
  } catch {
    // Pricing observability must never make generation unavailable.
    return null;
  }
}
