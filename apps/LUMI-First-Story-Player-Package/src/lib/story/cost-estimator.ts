export type StoryCostEstimateInput = {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  textInputPerMillionTry: number;
  textOutputPerMillionTry: number;
  imageCount: number;
  imageUnitCostTry: number;
  includeTts: boolean;
  estimatedTtsCharacters?: number;
  ttsPerMillionCharactersTry?: number;
};

export type StoryCostEstimate = {
  textCostTry: number;
  imageCostTry: number;
  ttsCostTry: number;
  totalCostTry: number;
};

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function estimateStoryCost(
  input: StoryCostEstimateInput,
): StoryCostEstimate {
  const textCostTry =
    (input.estimatedInputTokens / 1_000_000) *
      input.textInputPerMillionTry +
    (input.estimatedOutputTokens / 1_000_000) *
      input.textOutputPerMillionTry;

  const imageCostTry =
    input.imageCount * input.imageUnitCostTry;

  const ttsCostTry = input.includeTts
    ? ((input.estimatedTtsCharacters ?? 0) / 1_000_000) *
      (input.ttsPerMillionCharactersTry ?? 0)
    : 0;

  return {
    textCostTry: roundCurrency(textCostTry),
    imageCostTry: roundCurrency(imageCostTry),
    ttsCostTry: roundCurrency(ttsCostTry),
    totalCostTry: roundCurrency(
      textCostTry + imageCostTry + ttsCostTry,
    ),
  };
}
