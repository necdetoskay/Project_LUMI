export function calculateDecayIntensity(input: {
  dayOffset: number;
  fullIntensityDays: number;
  minimumIntensity: number;
  maxCatchUpDays: number;
}): number {
  if (input.dayOffset <= input.fullIntensityDays) {
    return 1;
  }

  const decayRange = Math.max(
    1,
    input.maxCatchUpDays -
      input.fullIntensityDays,
  );

  const progress = Math.min(
    1,
    (input.dayOffset -
      input.fullIntensityDays) /
      decayRange,
  );

  const intensity =
    1 -
    progress *
      (1 - input.minimumIntensity);

  return Math.max(
    input.minimumIntensity,
    Math.min(1, intensity),
  );
}
