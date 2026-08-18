import type { ProviderUsage } from "../../domain/generation-types";
import {
  ProviderTimeoutError,
  ProviderUnavailableError,
} from "../../domain/generation-errors";
import type {
  GenerationProvider,
  ProviderCompletion,
  ProviderCompletionRequest,
} from "../../ports/provider.port";

export interface OpenRouterProviderConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  appUrl?: string;
  appTitle?: string;
  fetchImpl?: typeof fetch;
}

interface OpenRouterChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost?: number;
    cost_details?: {
      upstream_inference_cost?: number;
    };
    prompt_tokens_details?: {
      cached_tokens?: number;
      cache_write_tokens?: number;
    };
    completion_tokens_details?: {
      reasoning_tokens?: number;
    };
  };
}

interface OpenRouterErrorBody {
  error?: { message?: string };
}

export class OpenRouterProvider implements GenerationProvider {
  public readonly providerId = "openrouter";
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly appUrl: string;
  private readonly appTitle: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: OpenRouterProviderConfig) {
    if (!config.apiKey) {
      throw new ProviderUnavailableError(
        "OpenRouterProvider requires an API key.",
      );
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://openrouter.ai/api/v1";
    this.defaultModel = config.defaultModel ?? "openrouter/auto";
    this.appUrl = config.appUrl ?? "https://lumi.app";
    this.appTitle = config.appTitle ?? "Project LUMI";
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  public supportsModel(modelId: string): boolean {
    if (modelId === this.defaultModel || modelId === "openrouter/auto") return true;
    return modelId.includes("/") && !modelId.startsWith("test-");
  }

  public async complete(
    request: ProviderCompletionRequest,
  ): Promise<ProviderCompletion> {
    const body: Record<string, unknown> = {
      model: request.model,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.prompt },
      ],
    };
    if (request.temperature !== undefined)
      body.temperature = request.temperature;
    if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;
    if (request.jsonMode) body.response_format = { type: "json_object" };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), request.timeoutMs);
    const startedAt = Date.now();

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": this.appUrl,
          "X-Title": this.appTitle,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw new ProviderTimeoutError(
          `Provider request timed out after ${request.timeoutMs}ms.`,
        );
      }
      throw new ProviderUnavailableError(
        `Provider request failed: ${messageOf(error)}`,
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const errorText = await safeResponseText(response);
      throw new ProviderUnavailableError(
        `OpenRouter API error (${response.status}): ${errorText}`,
      );
    }

    let data: OpenRouterChatResponse;
    try {
      data = (await response.json()) as OpenRouterChatResponse;
    } catch {
      throw new ProviderUnavailableError("OpenRouter returned invalid JSON.");
    }

    const content = data.choices?.[0]?.message?.content ?? "";
    const actualCostUsd = nonNegativeNumber(data.usage?.cost);
    const upstreamInferenceCostUsd = nonNegativeNumber(
      data.usage?.cost_details?.upstream_inference_cost,
    );
    const usage: ProviderUsage = {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
      latencyMs: Math.max(0, Date.now() - startedAt),
      costUsd: actualCostUsd ?? 0,
      cachedInputTokens: data.usage?.prompt_tokens_details?.cached_tokens ?? 0,
      cacheWriteTokens:
        data.usage?.prompt_tokens_details?.cache_write_tokens ?? 0,
      reasoningTokens:
        data.usage?.completion_tokens_details?.reasoning_tokens ?? 0,
      ...(actualCostUsd === null ? {} : { actualCostUsd }),
      ...(upstreamInferenceCostUsd === null
        ? {}
        : { upstreamInferenceCostUsd }),
    };

    return {
      content,
      providerId: this.providerId,
      model: data.model ?? request.model,
      usage,
    };
  }
}

function nonNegativeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function isAbortError(error: unknown): boolean {
  if (error instanceof Error && error.name === "AbortError") return true;
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function safeResponseText(response: Response): Promise<string> {
  try {
    const text = await response.text();
    let parsed: OpenRouterErrorBody | null = null;
    try {
      parsed = JSON.parse(text) as OpenRouterErrorBody;
    } catch {
      // fall through
    }
    return parsed?.error?.message ?? text ?? "Unknown error";
  } catch {
    return "Unknown error";
  }
}
