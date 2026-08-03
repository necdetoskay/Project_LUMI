import { describe, expect, it } from "vitest";

import { TestProvider } from "../../src/infrastructure/providers/test-provider";
import type { ProviderCompletionRequest } from "../../src/ports/provider.port";
import { ProviderUnavailableError } from "../../src/domain/generation-errors";

const BASE_REQUEST: ProviderCompletionRequest = {
  requestId: "req:1",
  task: "story_scene",
  model: "test-model",
  systemPrompt: "system",
  prompt: "hello",
  temperature: 0.7,
  maxTokens: 256,
  timeoutMs: 5000,
};

describe("TestProvider contract", () => {
  it("returns a deterministic completion for a plain request", async () => {
    const provider = new TestProvider({
      defaultRawResponse: '{"scene":"once upon"}',
    });
    const result = await provider.complete(BASE_REQUEST);

    expect(result.providerId).toBe("test-provider");
    expect(result.model).toBe("test-model");
    expect(result.content).toBe('{"scene":"once upon"}');
    expect(result.usage.totalTokens).toBe(160);
    expect(provider.calls).toHaveLength(1);
  });

  it("honors per-request scripts", async () => {
    const provider = new TestProvider();
    provider.scriptRequest("req:scripted", { rawResponse: '{"custom":true}' });

    const result = await provider.complete({
      ...BASE_REQUEST,
      requestId: "req:scripted",
    });
    expect(result.content).toBe('{"custom":true}');
  });

  it("throws a typed provider error on simulated failure", async () => {
    const provider = new TestProvider();
    provider.scriptRequest("req:fail", { failWith: "unavailable" });

    await expect(
      provider.complete({ ...BASE_REQUEST, requestId: "req:fail" }),
    ).rejects.toBeInstanceOf(ProviderUnavailableError);
    expect(provider.failCount).toBe(1);
  });

  it("supports model matching for its own model and test- prefix", () => {
    const provider = new TestProvider({ model: "test-model" });
    expect(provider.supportsModel("test-model")).toBe(true);
    expect(provider.supportsModel("test-model-extra")).toBe(true);
    expect(provider.supportsModel("openrouter/xyz")).toBe(false);
  });

  it("applies latency delays", async () => {
    const provider = new TestProvider();
    provider.scriptRequest("req:slow", { latencyMs: 25 });
    const started = Date.now();
    await provider.complete({ ...BASE_REQUEST, requestId: "req:slow" });
    expect(Date.now() - started).toBeGreaterThanOrEqual(20);
  });
});
