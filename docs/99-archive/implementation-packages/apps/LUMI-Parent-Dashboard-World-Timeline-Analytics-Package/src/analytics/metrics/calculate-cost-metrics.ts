import type { CostMetrics } from "../types";

export function calculateCostMetrics(input: {
  estimatedTry: number;
  actualTry: number;
  textGenerationTry: number;
  imageGenerationTry: number;
  audioGenerationTry: number;
}): CostMetrics {
  return {
    ...input,
    varianceTry:
      input.actualTry - input.estimatedTry,
  };
}
