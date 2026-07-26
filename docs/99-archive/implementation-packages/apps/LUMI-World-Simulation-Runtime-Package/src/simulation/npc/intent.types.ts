export type NpcIntentCandidate = {
  intentType:
    | "routine"
    | "goal_progress"
    | "social"
    | "rumor"
    | "gift"
    | "warning"
    | "exploration"
    | "rest";
  baseUtility: number;
  urgency: number;
  emotionalAlignment: number;
  goalAlignment: number;
  relationshipAlignment: number;
  environmentalFit: number;
  novelty: number;
  risk: number;
  metadata?: Record<string, unknown>;
};

export type EvaluatedNpcIntent =
  NpcIntentCandidate & {
    utility: number;
  };
