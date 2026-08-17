import type { LlmTaskType } from "../../db/schema/profile/llm-task-model-settings";

export const GENERATION_IMPACT_TIERS = ["S", "A", "B"] as const;
export type GenerationImpactTier = (typeof GENERATION_IMPACT_TIERS)[number];

export interface GenerationImpactPolicy {
  tier: GenerationImpactTier;
  protectedCanonWriter: boolean;
  mayUseEconomyFallback: boolean;
  evaluatorRecommended: boolean;
}

const TIER_S = new Set<LlmTaskType>([
  "character_genesis",
  "creative_divergence",
  "genesis_evaluation",
  "saga_foundation",
]);

const TIER_A = new Set<LlmTaskType>([
  "social_ecology_bootstrap",
  "living_world_bootstrap",
  "initial_world_opportunities",
  "saga_progression",
  "character_core_saga",
  "character_origin_generation",
]);

export function generationImpactPolicy(
  taskType: LlmTaskType,
): GenerationImpactPolicy {
  if (TIER_S.has(taskType)) {
    return {
      tier: "S",
      protectedCanonWriter: true,
      mayUseEconomyFallback: false,
      evaluatorRecommended: taskType !== "genesis_evaluation",
    };
  }

  if (TIER_A.has(taskType)) {
    return {
      tier: "A",
      protectedCanonWriter: taskType === "saga_progression",
      mayUseEconomyFallback: true,
      evaluatorRecommended: false,
    };
  }

  return {
    tier: "B",
    protectedCanonWriter: false,
    mayUseEconomyFallback: true,
    evaluatorRecommended: false,
  };
}

export function assertTaskCanMutateProtectedCanon(taskType: LlmTaskType): void {
  if (!generationImpactPolicy(taskType).protectedCanonWriter) {
    throw new Error(
      `Generation task ${taskType} is not allowed to mutate protected foundation canon`,
    );
  }
}
