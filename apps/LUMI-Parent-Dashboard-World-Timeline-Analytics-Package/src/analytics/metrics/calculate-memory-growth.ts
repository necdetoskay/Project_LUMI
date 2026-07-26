export type MemoryGrowthPoint = {
  date: string;
  count: number;
};

export function calculateMemoryGrowth(
  occurredAt: Date[],
): MemoryGrowthPoint[] {
  const buckets = new Map<string, number>();

  for (const date of occurredAt) {
    const key = date.toISOString().slice(0, 10);
    buckets.set(
      key,
      (buckets.get(key) ?? 0) + 1,
    );
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date,
      count,
    }));
}
