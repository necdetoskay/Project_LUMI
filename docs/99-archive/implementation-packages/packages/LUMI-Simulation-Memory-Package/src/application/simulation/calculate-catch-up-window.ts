export type CatchUpWindow = {
  requestedFrom: Date;
  requestedTo: Date;
  effectiveFrom: Date;
  effectiveTo: Date;
  skippedDays: number;
  frozen: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function calculateCatchUpWindow(input: {
  lastActiveAt: Date;
  now: Date;
  maxCatchUpDays?: number;
  freezeAfterLimit?: boolean;
}): CatchUpWindow {
  const maxCatchUpDays = input.maxCatchUpDays ?? 10;
  const freezeAfterLimit = input.freezeAfterLimit ?? true;
  const elapsedDays = Math.max(0, (input.now.getTime() - input.lastActiveAt.getTime()) / DAY_MS);

  if (elapsedDays <= maxCatchUpDays) {
    return {
      requestedFrom: input.lastActiveAt,
      requestedTo: input.now,
      effectiveFrom: input.lastActiveAt,
      effectiveTo: input.now,
      skippedDays: 0,
      frozen: false,
    };
  }

  if (freezeAfterLimit) {
    return {
      requestedFrom: input.lastActiveAt,
      requestedTo: input.now,
      effectiveFrom: input.lastActiveAt,
      effectiveTo: input.lastActiveAt,
      skippedDays: Math.floor(elapsedDays),
      frozen: true,
    };
  }

  const effectiveFrom = new Date(input.now.getTime() - maxCatchUpDays * DAY_MS);

  return {
    requestedFrom: input.lastActiveAt,
    requestedTo: input.now,
    effectiveFrom,
    effectiveTo: input.now,
    skippedDays: Math.floor(elapsedDays - maxCatchUpDays),
    frozen: false,
  };
}
