export type MemoryRelevanceComponents = {
  semanticScore: number;
  subjectScore: number;
  recencyScore: number;
  importance: number;
  emotionalSalience: number;
  consequenceWeight: number;
};

export function calculateMemoryRelevance(
  input: MemoryRelevanceComponents,
): number {
  const score =
    input.semanticScore * 0.3 +
    input.subjectScore * 0.2 +
    input.recencyScore * 0.15 +
    input.importance * 0.15 +
    input.emotionalSalience * 0.1 +
    input.consequenceWeight * 0.1;

  return Math.max(0, Math.min(1, score));
}
