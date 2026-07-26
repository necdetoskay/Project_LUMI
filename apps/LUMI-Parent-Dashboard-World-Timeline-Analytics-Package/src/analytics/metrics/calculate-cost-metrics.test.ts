import { describe, expect, it } from "vitest";
import { calculateCostMetrics } from "./calculate-cost-metrics";

describe("cost metrics", () => {
  it("calculates actual-estimated variance", () => {
    const result = calculateCostMetrics({
      estimatedTry: 50,
      actualTry: 57.5,
      textGenerationTry: 10,
      imageGenerationTry: 40,
      audioGenerationTry: 7.5,
    });

    expect(result.varianceTry).toBe(7.5);
  });
});
