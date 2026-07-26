export function calculateDecayIntensity(input: {
  elapsedDays: number;
  fullIntensityDays?: number;
  maxCatchUpDays?: number;
  minimumIntensity?: number;
}): number {
  const fullIntensityDays = input.fullIntensityDays ?? 1;
  const maxCatchUpDays = input.maxCatchUpDays ?? 10;
  const minimumIntensity = input.minimumIntensity ?? 0.1;

  if (input.elapsedDays <= fullIntensityDays) return 1;
  if (input.elapsedDays >= maxCatchUpDays) return minimumIntensity;

  const progress =
    (input.elapsedDays - fullIntensityDays) /
    Math.max(1, maxCatchUpDays - fullIntensityDays);

  return Number(
    Math.max(
      minimumIntensity,
      1 - progress * (1 - minimumIntensity),
    ).toFixed(4),
  );
}
