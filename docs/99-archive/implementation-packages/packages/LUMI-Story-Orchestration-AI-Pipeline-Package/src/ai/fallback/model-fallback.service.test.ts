import { describe, expect, it } from "vitest";
import { AiProviderRegistry } from "../providers/provider-registry";
import { ModelFallbackService } from "./model-fallback.service";
import { AiProviderError } from "../providers/provider-error";

describe("model fallback service", () => {
  it("uses the next provider after retryable failure", async () => {
    const registry = new AiProviderRegistry();

    registry.registerTextProvider({
      providerCode: "first",
      async generateStructured() {
        throw new AiProviderError(
          "temporary",
          "first",
          "TEMP",
          true,
        );
      },
    });

    registry.registerTextProvider({
      providerCode: "second",
      async generateStructured() {
        return {
          model: "second-model",
          output: { ok: true },
          usage: {
            inputTokens: 1,
            outputTokens: 1,
          },
          latencyMs: 1,
        };
      },
    });

    const service =
      new ModelFallbackService(registry);

    const result = await service.execute(
      {
        capability: "story_generation",
        candidates: [
          {
            providerCode: "first",
            modelCode: "first-model",
            priority: 1,
            maxAttempts: 1,
            enabled: true,
          },
          {
            providerCode: "second",
            modelCode: "second-model",
            priority: 2,
            maxAttempts: 1,
            enabled: true,
          },
        ],
      },
      {
        userPrompt: "test",
      },
    );

    expect(result.providerCode).toBe(
      "second",
    );
  });
});
