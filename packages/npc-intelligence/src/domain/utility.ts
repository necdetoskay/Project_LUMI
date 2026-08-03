import { assertFiniteNumber } from "./validation";

export interface UtilityWeights {
  needSatisfaction: number;
  emotionalComfort: number;
  safety: number;
  goalAlignment: number;
  relationshipImpact: number;
  socialApproval: number;
  curiosity: number;
  personalityFit: number;
  timeSensitivity: number;
  /** Cost weights are <= 0 penalties. */
  resourceCost: number;
  timeCost: number;
}

export interface UtilityWeightPolicy {
  version: string;
  weights: UtilityWeights;
  updatedAt: Date;
}

export interface UtilityComponents {
  needSatisfaction: number;
  emotionalComfort: number;
  safety: number;
  goalAlignment: number;
  relationshipImpact: number;
  socialApproval: number;
  curiosity: number;
  personalityFit: number;
  timeSensitivity: number;
  resourceCost: number;
  timeCost: number;
}

export interface UtilityScore {
  candidateId: string;
  total: number;
  components: UtilityComponents;
  policyVersion: string;
  reasons: string[];
}

const BENEFIT_WEIGHT_KEYS = [
  "needSatisfaction",
  "emotionalComfort",
  "safety",
  "goalAlignment",
  "relationshipImpact",
  "socialApproval",
  "curiosity",
  "personalityFit",
  "timeSensitivity",
] as const satisfies readonly (keyof UtilityWeights)[];

const COST_WEIGHT_KEYS = [
  "resourceCost",
  "timeCost",
] as const satisfies readonly (keyof UtilityWeights)[];

export function validateWeightPolicy(policy: UtilityWeightPolicy): void {
  if (
    typeof policy.version !== "string" ||
    policy.version.trim().length === 0
  ) {
    throw new Error("weight policy version must be a non-empty string");
  }
  for (const key of BENEFIT_WEIGHT_KEYS) {
    assertFiniteNumber(policy.weights[key], `weights.${key}`);
    if (policy.weights[key] < 0) {
      throw new Error(`weights.${key} must be >= 0`);
    }
  }
  for (const key of COST_WEIGHT_KEYS) {
    assertFiniteNumber(policy.weights[key], `weights.${key}`);
    if (policy.weights[key] > 0) {
      throw new Error(`weights.${key} must be <= 0`);
    }
  }
}

export function computeUtilityScore(
  components: UtilityComponents,
  policy: UtilityWeightPolicy,
): number {
  const weights = policy.weights;
  const total =
    components.needSatisfaction * weights.needSatisfaction +
    components.emotionalComfort * weights.emotionalComfort +
    components.safety * weights.safety +
    components.goalAlignment * weights.goalAlignment +
    components.relationshipImpact * weights.relationshipImpact +
    components.socialApproval * weights.socialApproval +
    components.curiosity * weights.curiosity +
    components.personalityFit * weights.personalityFit +
    components.timeSensitivity * weights.timeSensitivity +
    components.resourceCost * weights.resourceCost +
    components.timeCost * weights.timeCost;
  return Number(total.toFixed(6));
}
