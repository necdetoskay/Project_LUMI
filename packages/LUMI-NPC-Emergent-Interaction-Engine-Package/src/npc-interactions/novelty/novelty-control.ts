export function calculateNoveltyScore(input: {
  sameTypeCountLast7Days: number;
  sameSourceCountLast7Days: number;
  similarSummaryCountLast30Days: number;
}): number {
  const penalty =
    Math.min(0.4, input.sameTypeCountLast7Days * 0.08) +
    Math.min(0.3, input.sameSourceCountLast7Days * 0.06) +
    Math.min(
      0.3,
      input.similarSummaryCountLast30Days * 0.1,
    );

  return Math.max(0, 1 - penalty);
}
