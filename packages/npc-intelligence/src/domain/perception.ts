export const PERCEIVED_FACT_CATEGORIES = [
  "location",
  "character",
  "event",
  "item",
  "time",
  "weather",
  "relationship",
] as const;
export type PerceivedFactCategory = (typeof PERCEIVED_FACT_CATEGORIES)[number];

export const FACT_SENSITIVITY = ["safe", "personal"] as const;
export type FactSensitivity = (typeof FACT_SENSITIVITY)[number];

/**
 * How far a fact is from the NPC in the world. Facts beyond the NPC's
 * perceptive reach cannot enter its decision context.
 */
export const PERCEPTION_REACH = [
  "self",
  "current_location",
  "adjacent_location",
  "known_character",
  "household",
  "unreachable",
] as const;
export type PerceptionReach = (typeof PERCEPTION_REACH)[number];

/** Reaches the NPC can observe directly without a belief. */
export const DIRECTLY_OBSERVABLE_REACHES: readonly PerceptionReach[] = [
  "self",
  "current_location",
  "adjacent_location",
  "known_character",
  "household",
];

export type PerceivedFactSource = "observation" | "belief";

export interface RawWorldFact {
  factId: string;
  householdId: string;
  category: PerceivedFactCategory;
  claim: string;
  locationId: string | null;
  originNpcId: string | null;
  observedAt: Date;
  confidence: number;
  sensitivity: FactSensitivity;
  reach: PerceptionReach;
}

export interface PerceivedFact {
  factId: string;
  category: PerceivedFactCategory;
  claim: string;
  observedAt: Date;
  confidence: number;
  sensitivity: FactSensitivity;
  source: PerceivedFactSource;
}

export interface PerceptionWindow {
  npcId: string;
  householdId: string;
  atLocationId: string | null;
  perceivedFacts: PerceivedFact[];
  nearbyCharacterIds: string[];
  spatialProximity: Record<string, number>;
  timeSensitivity: number;
  reachedAt: Date;
}

export interface PerceptionBuildInput {
  npcId: string;
  householdId: string;
  atLocationId: string | null;
  facts: RawWorldFact[];
  nearbyCharacterIds: string[];
  spatialProximity: Record<string, number>;
  timeSensitivity: number;
  reachedAt: Date;
}
