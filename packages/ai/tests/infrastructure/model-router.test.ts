import { describe, expect, it } from "vitest";

import { ModelRouter } from "../../src/infrastructure/model-router";
import { TestProvider } from "../../src/infrastructure/providers/test-provider";
import type { ModelPolicy } from "../../src/domain/generation-types";

const POLICY: ModelPolicy = {
  preferredModel: "test-model",
  fallbackModels: [],
  maxAttempts: 3,
  maxRepairs: 1,
  timeoutMs: 5000,
};

describe("ModelRouter", () => {
  it("registers and resolves providers", () => {
    const router = new ModelRouter();
    const provider = new TestProvider();
    router.registerProvider(provider);
    expect(router.provider("test-provider")).toBe(provider);
    expect(router.provider("missing")).toBeUndefined();
  });

  it("chooses the preferred model when supported", async () => {
    const router = new ModelRouter({ temperature: 0.3, maxTokens: 128 });
    router.registerProvider(new TestProvider({ model: "test-model" }));
    const choice = await router.choose(POLICY, "story_scene");
    expect(choice.providerId).toBe("test-provider");
    expect(choice.modelId).toBe("test-model");
    expect(choice.temperature).toBe(0.3);
    expect(choice.maxTokens).toBe(128);
  });

  it("falls back to the first supported model when preferred is unsupported", async () => {
    const router = new ModelRouter();
    router.registerProvider(new TestProvider({ model: "test-backup" }));
    const choice = await router.choose(
      {
        ...POLICY,
        preferredModel: "openrouter/xyz",
        fallbackModels: ["test-backup"],
      },
      "story_scene",
    );
    expect(choice.modelId).toBe("test-backup");
  });

  it("falls back across multiple fallback models in order", async () => {
    const router = new ModelRouter();
    const primary = new TestProvider({ model: "test-primary" });
    const secondary = new TestProvider({ model: "test-secondary" });
    router.registerProvider(primary);
    router.registerProvider(secondary);
    const choice = await router.choose(
      {
        ...POLICY,
        preferredModel: "openrouter/xyz",
        fallbackModels: ["test-primary", "test-secondary"],
      },
      "story_scene",
    );
    expect(choice.modelId).toBe("test-primary");
  });

  it("throws when no provider supports any candidate model", async () => {
    const router = new ModelRouter();
    router.registerProvider(new TestProvider({ model: "test-model" }));
    await expect(
      router.choose(
        {
          ...POLICY,
          preferredModel: "openrouter/xyz",
          fallbackModels: ["anthropic/xyz"],
        },
        "story_scene",
      ),
    ).rejects.toThrow("No provider available");
  });

  it("routes a completion through the selected provider", async () => {
    const router = new ModelRouter();
    const provider = new TestProvider({ model: "test-model" });
    router.registerProvider(provider);

    const choice = await router.choose(POLICY, "story_scene");
    const result = await router.provider(choice.providerId)?.complete({
      requestId: "req:route",
      task: "story_scene",
      model: choice.modelId,
      systemPrompt: "sys",
      prompt: "hello",
      temperature: choice.temperature,
      maxTokens: choice.maxTokens,
      timeoutMs: 5000,
    });

    expect(result?.content).toBe('{"ok":true}');
  });
});
