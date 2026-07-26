export type EntityRelevanceInput = {
  entityId: string;
  entityType: string;
  proximityScore: number;
  unresolvedGoalScore: number;
  activeConditionScore: number;
  relationshipScore: number;
  recentInteractionScore: number;
  timeSensitivityScore: number;
};

export type EntityRelevanceResult = {
  entityId: string;
  entityType: string;
  score: number;
};
