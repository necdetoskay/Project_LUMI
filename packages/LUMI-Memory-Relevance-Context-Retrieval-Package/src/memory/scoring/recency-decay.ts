const DAY_MS = 24 * 60 * 60 * 1000;

export function calculateRecencyScore(input: {
  occurredAt: Date;
  now: Date;
  halfLifeDays: number;
  minimumScore?: number;
}): number {
  const ageDays = Math.max(
    0,
    (input.now.getTime() -
      input.occurredAt.getTime()) /
      DAY_MS,
  );

  const score = Math.pow(
    0.5,
    ageDays / Math.max(0.1, input.halfLifeDays),
  );

  return Math.max(
    input.minimumScore ?? 0,
    Math.min(1, score),
  );
}
