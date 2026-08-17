import type {
  LlmTaskType,
  ReasoningLevel,
} from "../../db/schema/profile/llm-task-model-settings";
import { ValidationError } from "../../domain";
import { getTaskModelSetting } from "./llm-settings.service";

export const GENERATION_CRITICALITY_TIERS = ["S", "A", "B"] as const;
export type GenerationCriticalityTier =
  (typeof GENERATION_CRITICALITY_TIERS)[number];

export const IMPACT_AWARE_GENERATION_INTENTS = [
  "character_genesis",
  "genesis_divergence",
  "genesis_evaluation",
  "saga_foundation",
  "social_ecology_generation",
  "living_world_bootstrap",
  "adventure_opportunity_generation",
  "adventure_teaser",
  "story_recap",
] as const;
export type ImpactAwareGenerationIntent =
  (typeof IMPACT_AWARE_GENERATION_INTENTS)[number];

export type FoundationMutationTarget =
  | "genesis"
  | "saga_canon"
  | "saga_progression"
  | "bootstrap_manifest"
  | "presentation";

export interface GenerationRoutingPolicy {
  intent: ImpactAwareGenerationIntent;
  taskType: LlmTaskType;
  tier: GenerationCriticalityTier;
  defaultReasoningLevel: ReasoningLevel;
  defaultTemperature: number;
  defaultMaxOutputTokens: number;
  allowTierDowngrade: boolean;
  mayMutate: readonly FoundationMutationTarget[];
}

export interface ResolvedGenerationRoute extends GenerationRoutingPolicy {
  provider: "openrouter";
  modelId: string;
  reasoningLevel: string;
  temperature: number;
  maxOutputTokens: number;
  source: "household_setting" | "tier_default";
  traceMetadata: {
    generationIntent: ImpactAwareGenerationIntent;
    criticalityTier: GenerationCriticalityTier;
    routeSource: "household_setting" | "tier_default";
  };
}

const POLICIES: Record<ImpactAwareGenerationIntent, GenerationRoutingPolicy> = {
  character_genesis: critical("character_genesis", ["genesis"]),
  genesis_divergence: critical("genesis_divergence", ["genesis"]),
  genesis_evaluation: critical("genesis_evaluation", []),
  saga_foundation: critical("saga_foundation", [
    "saga_canon",
    "saga_progression",
  ]),
  social_ecology_generation: important("social_ecology_generation", [
    "genesis",
  ]),
  living_world_bootstrap: important("living_world_bootstrap", [
    "bootstrap_manifest",
  ]),
  adventure_opportunity_generation: important(
    "adventure_opportunity_generation",
    ["bootstrap_manifest"],
  ),
  adventure_teaser: operational("adventure_teaser"),
  story_recap: operational("story_recap"),
};

export function getGenerationRoutingPolicy(
  intent: ImpactAwareGenerationIntent,
): GenerationRoutingPolicy {
  return POLICIES[intent];
}

export async function resolveGenerationRoute(
  userId: string,
  householdId: string,
  intent: ImpactAwareGenerationIntent,
): Promise<ResolvedGenerationRoute> {
  const policy = getGenerationRoutingPolicy(intent);
  const setting = await getTaskModelSetting(
    userId,
    householdId,
    policy.taskType,
  );

  if (setting?.enabled) {
    return {
      ...policy,
      provider: "openrouter",
      modelId: setting.modelId,
      reasoningLevel: setting.reasoningLevel,
      temperature: setting.temperature,
      maxOutputTokens: setting.maxOutputTokens,
      source: "household_setting",
      traceMetadata: {
        generationIntent: intent,
        criticalityTier: policy.tier,
        routeSource: "household_setting",
      },
    };
  }

  if (setting && !setting.enabled && policy.tier === "S") {
    throw new ValidationError(
      "FOUNDATION_CRITICAL_ROUTE_DISABLED",
      `Tier S generation route ${intent} is disabled; critical generation will not silently downgrade`,
      "generationIntent",
    );
  }

  const modelId = tierDefaultModel(policy.tier);
  if (!modelId) {
    throw new ValidationError(
      "FOUNDATION_CRITICAL_MODEL_NOT_CONFIGURED",
      `Tier S generation route ${intent} requires an explicit household model or LUMI_TIER_S_DEFAULT_MODEL`,
      "generationIntent",
    );
  }

  return {
    ...policy,
    provider: "openrouter",
    modelId,
    reasoningLevel: policy.defaultReasoningLevel,
    temperature: policy.defaultTemperature,
    maxOutputTokens: policy.defaultMaxOutputTokens,
    source: "tier_default",
    traceMetadata: {
      generationIntent: intent,
      criticalityTier: policy.tier,
      routeSource: "tier_default",
    },
  };
}

export function assertGenerationIntentMayMutate(
  intent: ImpactAwareGenerationIntent,
  target: FoundationMutationTarget,
): void {
  const policy = getGenerationRoutingPolicy(intent);

  if (
    policy.tier === "B" &&
    (target === "genesis" || target === "saga_canon")
  ) {
    throw new ValidationError(
      "OPERATIONAL_MODEL_CANNOT_MUTATE_CANON",
      "Tier B generation may not mutate protected Genesis or Saga Canon",
      "generationIntent",
    );
  }

  if (!policy.mayMutate.includes(target)) {
    throw new ValidationError(
      "GENERATION_MUTATION_NOT_ALLOWED",
      `${intent} (${policy.tier}) may not mutate ${target}`,
      "generationIntent",
    );
  }
}

export function buildGenerationTraceRoutingMetadata(
  route: ResolvedGenerationRoute,
): Record<string, unknown> {
  return {
    generationIntent: route.intent,
    criticalityTier: route.tier,
    routeSource: route.source,
    modelId: route.modelId,
    reasoningLevel: route.reasoningLevel,
  };
}

export function getTierDefaultModelForTesting(
  tier: GenerationCriticalityTier,
): string | null {
  return tierDefaultModel(tier);
}

function critical(
  taskType: LlmTaskType,
  mayMutate: readonly FoundationMutationTarget[],
): GenerationRoutingPolicy {
  return {
    intent: taskType as ImpactAwareGenerationIntent,
    taskType,
    tier: "S",
    defaultReasoningLevel: "high",
    defaultTemperature: 0.9,
    defaultMaxOutputTokens: 3200,
    allowTierDowngrade: false,
    mayMutate,
  };
}

function important(
  taskType: LlmTaskType,
  mayMutate: readonly FoundationMutationTarget[],
): GenerationRoutingPolicy {
  return {
    intent: taskType as ImpactAwareGenerationIntent,
    taskType,
    tier: "A",
    defaultReasoningLevel: "medium",
    defaultTemperature: 0.85,
    defaultMaxOutputTokens: 2400,
    allowTierDowngrade: true,
    mayMutate,
  };
}

function operational(taskType: LlmTaskType): GenerationRoutingPolicy {
  return {
    intent: taskType as ImpactAwareGenerationIntent,
    taskType,
    tier: "B",
    defaultReasoningLevel: "low",
    defaultTemperature: 0.7,
    defaultMaxOutputTokens: 1200,
    allowTierDowngrade: true,
    mayMutate: ["presentation"],
  };
}

function tierDefaultModel(tier: GenerationCriticalityTier): string | null {
  const envName =
    tier === "S"
      ? "LUMI_TIER_S_DEFAULT_MODEL"
      : tier === "A"
        ? "LUMI_TIER_A_DEFAULT_MODEL"
        : "LUMI_TIER_B_DEFAULT_MODEL";
  const configured = process.env[envName]?.trim();
  if (configured) return configured;

  const general = process.env.LUMI_DEFAULT_OPENROUTER_MODEL?.trim();
  if (general) return general;

  if (tier === "S") return null;
  return "aion-labs/aion-3.0-mini";
}
