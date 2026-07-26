import type {
  EntityRelevanceInput,
  EntityRelevanceResult,
} from "./entity-relevance.types";

export function scoreEntityRelevance(
  input: EntityRelevanceInput,
): EntityRelevanceResult {
  const score =
    input.proximityScore * 0.25 +
    input.unresolvedGoalScore * 0.2 +
    input.activeConditionScore * 0.2 +
    input.relationshipScore * 0.15 +
    input.recentInteractionScore * 0.1 +
    input.timeSensitivityScore * 0.1;

  return {
    entityId: input.entityId,
    entityType: input.entityType,
    score: Math.max(
      0,
      Math.min(1, score),
    ),
  };
}

export function selectRelevantEntities(
  inputs: EntityRelevanceInput[],
  input: {
    threshold: number;
    maxEntities: number;
  },
): EntityRelevanceResult[] {
  return inputs
    .map(scoreEntityRelevance)
    .filter(
      (entity) =>
        entity.score >= input.threshold,
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, input.maxEntities);
}
