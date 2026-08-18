import { describe, expect, it } from "vitest";

import { OpenRouterProvider } from "../../src/infrastructure/providers/openrouter-provider";
import {
  ProviderTimeoutError,
  ProviderUnavailableError,
} from "../../src/domain/generation-errors";
import type { ProviderCompletionRequest } from "../../src/ports/provider.port";

function fakeFetch(
  handler: (url: string, init: RequestInit) => Promise<Response>,
) {
  return (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    return handler(String(input), init ?? {});
  }) as unknown as typeof fetch;
}

const BASE_REQUEST: ProviderCompletionRequest = {
  requestId: "req:open",
  task: "story_scene",
  model: "openrouter/auto",
  systemPrompt: "sys",
  prompt: "prompt",
  temperature: 0.5,
  maxTokens: 200,
  timeoutMs: 3000,
  jsonMode: true,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("OpenRouterProvider", () => {
  it("requires an API key", () => {
    expect(() => new OpenRouterProvider({ apiKey: "" })).toThrow(
      ProviderUnavailableError,
    );
  });

  it("posts chat completion and maps detailed provider usage", async () => {
    const captured: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = fakeFetch((url, init) => {
      captured.push({ url, init });
      return Promise.resolve(
        jsonResponse({
          choices: [{ message: { content: '{"scene":"hi"}' } }],
          model: "anthropic/claude-sonnet-4.5",
          usage: {
            prompt_tokens: 50,
            completion_tokens: 20,
            total_tokens: 70,
            cost: 0.00123,
            cost_details: { upstream_inference_cost: 0.0011 },
            prompt_tokens_details: {
              cached_tokens: 30,
              cache_write_tokens: 10,
            },
            completion_tokens_details: { reasoning_tokens: 4 },
          },
        }),
      );
    });

    const provider = new OpenRouterProvider({ apiKey: "secret", fetchImpl });
    const result = await provider.complete({
      ...BASE_REQUEST,
      model: "anthropic/claude-sonnet-4.5",
    });

    expect(result.content).toBe('{"scene":"hi"}');
    expect(result.model).toBe("anthropic/claude-sonnet-4.5");
    expect(result.usage.totalTokens).toBe(70);
    expect(result.usage.cachedInputTokens).toBe(30);
    expect(result.usage.cacheWriteTokens).toBe(10);
    expect(result.usage.reasoningTokens).toBe(4);
    expect(result.usage.actualCostUsd).toBe(0.00123);
    expect(result.usage.upstreamInferenceCostUsd).toBe(0.0011);
    expect(result.usage.costUsd).toBe(0.00123);
    expect(result.usage.latencyMs).toBeGreaterThanOrEqual(0);

    expect(captured[0]?.url).toBe(
      "https://openrouter.ai/api/v1/chat/completions",
    );
    const body = JSON.parse(String(captured[0]?.init.body)) as Record<
      string,
      unknown
    >;
    expect(body["model"]).toBe("anthropic/claude-sonnet-4.5");
    expect(body["temperature"]).toBe(0.5);
    expect(body["max_tokens"]).toBe(200);
    expect(body["response_format"]).toEqual({ type: "json_object" });
  });

  it("throws typed provider error on non-ok HTTP response", async () => {
    const fetchImpl = fakeFetch(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: { message: "rate limited" } }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const provider = new OpenRouterProvider({ apiKey: "secret", fetchImpl });
    await expect(provider.complete(BASE_REQUEST)).rejects.toBeInstanceOf(
      ProviderUnavailableError,
    );
  });

  it("throws typed timeout error when the fetch aborts", async () => {
    const fetchImpl = fakeFetch(
      () =>
        new Promise<Response>((_resolve, reject) => {
          const abortError = new Error("aborted");
          abortError.name = "AbortError";
          reject(abortError);
        }),
    );
    const provider = new OpenRouterProvider({ apiKey: "secret", fetchImpl });
    await expect(provider.complete(BASE_REQUEST)).rejects.toBeInstanceOf(
      ProviderTimeoutError,
    );
  });

  it("accepts exact OpenRouter catalog slugs without requiring an openrouter prefix", () => {
    const provider = new OpenRouterProvider({ apiKey: "secret" });
    expect(provider.supportsModel("openrouter/auto")).toBe(true);
    expect(provider.supportsModel("anthropic/claude-sonnet-4.5")).toBe(true);
    expect(provider.supportsModel("google/gemini-2.5-flash")).toBe(true);
    expect(provider.supportsModel("test-model")).toBe(false);
  });
});
