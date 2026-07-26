export type CatchUpWindow = {
  from: Date;
  to: Date;
  simulatedUntil: Date;
  elapsedDays: number;
  simulatedDays: number;
  frozen: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function calculateCatchUpWindow(input: {
  lastSimulatedAt: Date;
  now: Date;
  maxCatchUpDays: number;
  freezeAfterLimit: boolean;
}): CatchUpWindow {
  const elapsedMs = Math.max(
    0,
    input.now.getTime() -
      input.lastSimulatedAt.getTime(),
  );

  const elapsedDays = elapsedMs / DAY_MS;
  const simulatedDays = Math.min(
    elapsedDays,
    input.maxCatchUpDays,
  );

  const frozen =
    input.freezeAfterLimit &&
    elapsedDays > input.maxCatchUpDays;

  const simulatedUntil = new Date(
    input.lastSimulatedAt.getTime() +
      simulatedDays * DAY_MS,
  );

  return {
    from: input.lastSimulatedAt,
    to: input.now,
    simulatedUntil,
    elapsedDays,
    simulatedDays,
    frozen,
  };
}
