import { describe, expect, it } from "vitest";
import {
  calculateImageCostTry,
  calculateTtsCostTry,
  reconcileMediaCost,
} from "./calculate-media-cost";

describe("media cost", () => {
  it("calculates image cost by megapixel", () => {
    const result =
      calculateImageCostTry({
        width: 1000,
        height: 1000,
        usdPerMegapixel: 0.03,
        usdTryRate: 40,
      });

    expect(result).toBe(1.2);
  });

  it("calculates TTS cost by character", () => {
    const result =
      calculateTtsCostTry({
        characters: 500_000,
        usdPerMillionCharacters: 15,
        usdTryRate: 40,
      });

    expect(result).toBe(300);
  });

  it("reconciles estimate and actual", () => {
    expect(
      reconcileMediaCost({
        estimatedCostTry: 10,
        actualCostTry: 12.5,
      }).varianceTry,
    ).toBe(2.5);
  });
});
