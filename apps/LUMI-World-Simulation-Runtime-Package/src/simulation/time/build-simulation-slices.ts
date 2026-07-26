import { calculateDecayIntensity } from "./decay-intensity";

const DAY_MS = 24 * 60 * 60 * 1000;

export type SimulationSlice = {
  sliceStart: Date;
  sliceEnd: Date;
  dayOffset: number;
  intensity: number;
};

export function buildSimulationSlices(input: {
  from: Date;
  simulatedDays: number;
  fullIntensityDays: number;
  minimumIntensity: number;
  maxCatchUpDays: number;
}): SimulationSlice[] {
  const slices: SimulationSlice[] = [];

  for (
    let dayOffset = 1;
    dayOffset <= Math.ceil(input.simulatedDays);
    dayOffset += 1
  ) {
    const sliceStart = new Date(
      input.from.getTime() +
        (dayOffset - 1) * DAY_MS,
    );

    const sliceEnd = new Date(
      Math.min(
        input.from.getTime() +
          dayOffset * DAY_MS,
        input.from.getTime() +
          input.simulatedDays * DAY_MS,
      ),
    );

    slices.push({
      sliceStart,
      sliceEnd,
      dayOffset,
      intensity:
        calculateDecayIntensity({
          dayOffset,
          fullIntensityDays:
            input.fullIntensityDays,
          minimumIntensity:
            input.minimumIntensity,
          maxCatchUpDays:
            input.maxCatchUpDays,
        }),
    });
  }

  return slices;
}
