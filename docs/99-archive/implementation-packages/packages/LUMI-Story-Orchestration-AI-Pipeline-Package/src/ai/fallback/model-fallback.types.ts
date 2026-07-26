export type ModelFallbackCandidate = {
  providerCode: string;
  modelCode: string;
  priority: number;
  maxAttempts: number;
  enabled: boolean;
};

export type ModelFallbackPlan = {
  capability: "story_generation";
  candidates: ModelFallbackCandidate[];
};
