import { describe, expect, it } from "vitest";
import { estimateStoryCost } from "./cost-estimator";

describe("story cost estimator", () => {
  it("calculates text, image and tts costs", () => {
    const result = estimateStoryCost({
      estimatedInputTokens: 10_000,
      estimatedOutputTokens: 20_000,
      textInputPerMillionTry: 10,
      textOutputPerMillionTry: 30,
      imageCount: 4,
      imageUnitCostTry: 0.75,
      includeTts: true,
      estimatedTtsCharacters: 10_000,
      ttsPerMillionCharactersTry: 400,
    });

    expect(result.textCostTry).toBe(0.7);
    expect(result.imageCostTry).toBe(3);
    expect(result.ttsCostTry).toBe(4);
    expect(result.totalCostTry).toBe(7.7);
  });

  it("omits tts cost when disabled", () => {
    const result = estimateStoryCost({
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      textInputPerMillionTry: 0,
      textOutputPerMillionTry: 0,
      imageCount: 0,
      imageUnitCostTry: 0,
      includeTts: false,
    });

    expect(result.ttsCostTry).toBe(0);
  });
});
