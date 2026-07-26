export function calculateImageCostTry(input: {
  width: number;
  height: number;
  usdPerMegapixel: number;
  usdTryRate: number;
}): number {
  const megapixels =
    (input.width * input.height) / 1_000_000;

  return (
    megapixels *
    input.usdPerMegapixel *
    input.usdTryRate
  );
}

export function calculateTtsCostTry(input: {
  characters: number;
  usdPerMillionCharacters: number;
  usdTryRate: number;
}): number {
  return (
    (input.characters / 1_000_000) *
    input.usdPerMillionCharacters *
    input.usdTryRate
  );
}

export function reconcileMediaCost(input: {
  estimatedCostTry: number;
  actualCostTry: number;
}) {
  return {
    estimatedCostTry:
      input.estimatedCostTry,
    actualCostTry:
      input.actualCostTry,
    varianceTry:
      input.actualCostTry -
      input.estimatedCostTry,
  };
}
