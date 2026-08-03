import { ValidationError } from "./errors";
import { TRAIT_DIMENSIONS, EMOTION_DIMENSIONS, NEED_TYPES, CHARACTER_LIFECYCLE_STAGES, CHARACTER_SUBTYPES, type CharacterSubtype, type CharacterLifecycleStage, type TraitDimension, type EmotionDimension, type NeedType } from "./types";

export const MAX_TRAIT_DELTA = 0.15;

/** Tolerance for forged oldValue comparison (floating-point precision on REAL columns). */
export const TRAIT_OLD_VALUE_TOLERANCE = 1e-9;

/** Tolerance for bounded delta check (floating-point noise around the boundary). */
export const TRAIT_BOUND_TOLERANCE = 1e-9;

export interface TraitVector {
  [dimension: string]: number;
}

export interface EmotionVector {
  [dimension: string]: number;
}

export interface NeedState {
  needType: NeedType;
  value: number;
  decay: number;
}

export interface GoalState {
  id: string;
  needType: NeedType;
  description: string;
  priority: number;
  status: "active" | "completed" | "failed" | "abandoned";
  createdAt: Date;
  completedAt: Date | null;
}

export interface InfluenceVector {
  emotional: number;
  social: number;
  cultural: number;
  educational: number;
  political: number;
  environmental: number;
  familial: number;
  spiritual: number;
  historical: number;
}

export interface DirectionalRelationship {
  targetCharacterId: string;
  trust: number;
  affinity: number;
  familiarity: number;
  relationshipType: "friend" | "family" | "mentor" | "rival" | "neutral" | "custom";
  customTypeLabel?: string;
}

export interface TraitDeltaEntry {
  dimension: TraitDimension;
  oldValue?: number;
  newValue: number;
  evidence: string;
  deltaMagnitude?: number;
}

export interface ResolvedTraitDelta {
  dimension: TraitDimension;
  oldValue: number;
  newValue: number;
  evidence: string;
  deltaMagnitude: number;
}

export interface CharacterDomainEvent {
  id: string;
  characterId: string;
  eventType: string;
  eventVersion: number;
  aggregateVersion: number;
  actorHouseholdId: string;
  actorUserId: string | null;
  payload: Record<string, unknown>;
  createdAt: Date;
}

export function validateTraitVector(vector: TraitVector): void {
  if (!vector || typeof vector !== "object") {
    throw new ValidationError("INVALID_TRAIT_VECTOR", "Trait vector must be a non-null object", "traits");
  }
  for (const [key, value] of Object.entries(vector)) {
    if (!(TRAIT_DIMENSIONS as readonly string[]).includes(key)) {
      throw new ValidationError("UNKNOWN_TRAIT_DIMENSION", `Unknown trait dimension: ${key}`, key);
    }
    if (typeof value !== "number" || Number.isNaN(value)) {
      throw new ValidationError("INVALID_TRAIT_VALUE", `Trait value for ${key} must be a number`, key);
    }
    if (value < 0 || value > 1) {
      throw new ValidationError("TRAIT_OUT_OF_RANGE", `Trait value for ${key} must be between 0 and 1`, key);
    }
  }
}

export function validateEmotionVector(vector: EmotionVector): void {
  if (!vector || typeof vector !== "object") {
    throw new ValidationError("INVALID_EMOTION_VECTOR", "Emotion vector must be a non-null object", "emotions");
  }
  for (const [key, value] of Object.entries(vector)) {
    if (!(EMOTION_DIMENSIONS as readonly string[]).includes(key)) {
      throw new ValidationError("UNKNOWN_EMOTION_DIMENSION", `Unknown emotion dimension: ${key}`, key);
    }
    if (typeof value !== "number" || Number.isNaN(value)) {
      throw new ValidationError("INVALID_EMOTION_VALUE", `Emotion value for ${key} must be a number`, key);
    }
    if (value < 0 || value > 1) {
      throw new ValidationError("EMOTION_OUT_OF_RANGE", `Emotion value for ${key} must be between 0 and 1`, key);
    }
  }
}

export function validateNeeds(needs: NeedState[]): void {
  if (!Array.isArray(needs)) {
    throw new ValidationError("INVALID_NEEDS", "Needs must be an array", "needs");
  }
  for (const need of needs) {
    if (!(NEED_TYPES as readonly string[]).includes(need.needType)) {
      throw new ValidationError("UNKNOWN_NEED_TYPE", `Unknown need type: ${need.needType}`, "needType");
    }
    if (typeof need.value !== "number" || Number.isNaN(need.value)) {
      throw new ValidationError("INVALID_NEED_VALUE", `Need value must be a number`, "value");
    }
    if (need.value < 0 || need.value > 1) {
      throw new ValidationError("NEED_OUT_OF_RANGE", `Need value must be between 0 and 1`, "value");
    }
    if (typeof need.decay !== "number" || Number.isNaN(need.decay) || need.decay < 0 || need.decay > 1) {
      throw new ValidationError("INVALID_NEED_DECAY", `Need decay must be a number between 0 and 1`, "decay");
    }
  }
}

export function validateGoals(goals: GoalState[]): void {
  if (!Array.isArray(goals)) {
    throw new ValidationError("INVALID_GOALS", "Goals must be an array", "goals");
  }
  for (const goal of goals) {
    if (!(NEED_TYPES as readonly string[]).includes(goal.needType)) {
      throw new ValidationError("UNKNOWN_GOAL_NEED_TYPE", `Unknown need type in goal: ${goal.needType}`, "needType");
    }
    if (!goal.description || goal.description.length > 500) {
      throw new ValidationError("INVALID_GOAL_DESCRIPTION", "Goal description must be 1-500 characters", "description");
    }
    if (!["active", "completed", "failed", "abandoned"].includes(goal.status)) {
      throw new ValidationError("INVALID_GOAL_STATUS", "Goal status must be active/completed/failed/abandoned", "status");
    }
  }
}

export function validateInfluenceVector(influence: InfluenceVector): void {
  const dims: (keyof InfluenceVector)[] = ["emotional", "social", "cultural", "educational", "political", "environmental", "familial", "spiritual", "historical"];
  for (const dim of dims) {
    const value = influence[dim];
    if (typeof value !== "number" || Number.isNaN(value)) {
      throw new ValidationError("INVALID_INFLUENCE_VALUE", `Influence ${dim} must be a number`, dim);
    }
    if (value < 0 || value > 1) {
      throw new ValidationError("INFLUENCE_OUT_OF_RANGE", `Influence ${dim} must be between 0 and 1`, dim);
    }
  }
}

export function validateRelationships(relationships: DirectionalRelationship[]): void {
  if (!Array.isArray(relationships)) {
    throw new ValidationError("INVALID_RELATIONSHIPS", "Relationships must be an array", "relationships");
  }
  const seen = new Set<string>();
  for (const rel of relationships) {
    if (!rel.targetCharacterId) {
      throw new ValidationError("INVALID_RELATIONSHIP_TARGET", "Relationship target ID is required", "targetCharacterId");
    }
    if (seen.has(rel.targetCharacterId)) {
      throw new ValidationError("DUPLICATE_RELATIONSHIP", `Duplicate relationship to ${rel.targetCharacterId}`, "targetCharacterId");
    }
    seen.add(rel.targetCharacterId);
    if (typeof rel.trust !== "number" || rel.trust < 0 || rel.trust > 1) {
      throw new ValidationError("RELATIONSHIP_TRUST_RANGE", "Trust must be between 0 and 1", "trust");
    }
    if (typeof rel.affinity !== "number" || rel.affinity < 0 || rel.affinity > 1) {
      throw new ValidationError("RELATIONSHIP_AFFINITY_RANGE", "Affinity must be between 0 and 1", "affinity");
    }
    if (typeof rel.familiarity !== "number" || rel.familiarity < 0 || rel.familiarity > 1) {
      throw new ValidationError("RELATIONSHIP_FAMILIARITY_RANGE", "Familiarity must be between 0 and 1", "familiarity");
    }
  }
}

export function validateTraitDelta(delta: TraitDeltaEntry): void {
  if (!(TRAIT_DIMENSIONS as readonly string[]).includes(delta.dimension)) {
    throw new ValidationError("INVALID_TRAIT_DELTA_DIMENSION", `Unknown trait dimension: ${delta.dimension}`, "dimension");
  }
  if (delta.oldValue !== undefined && (typeof delta.oldValue !== "number" || Number.isNaN(delta.oldValue) || delta.oldValue < 0 || delta.oldValue > 1)) {
    throw new ValidationError("INVALID_TRAIT_DELTA_OLD_VALUE", "Old value must be a number between 0 and 1", "oldValue");
  }
  if (typeof delta.newValue !== "number" || Number.isNaN(delta.newValue) || delta.newValue < 0 || delta.newValue > 1) {
    throw new ValidationError("INVALID_TRAIT_DELTA_NEW_VALUE", "New value must be a number between 0 and 1", "newValue");
  }
  if (!delta.evidence || delta.evidence.trim().length < 1) {
    throw new ValidationError("TRAIT_DELTA_REQUIRES_EVIDENCE", "Trait delta requires evidence", "evidence");
  }
  if (delta.evidence.length > 500) {
    throw new ValidationError("TRAIT_DELTA_EVIDENCE_TOO_LONG", "Evidence must be 500 characters or less", "evidence");
  }
}

/**
 * Server-side resolution of a trait delta against the authoritative current value.
 * - If the client supplied `oldValue`, it MUST match the actual current value (within float tolerance),
 *   otherwise the request is rejected as forged (`TRAIT_OLD_VALUE_MISMATCH`).
 * - `deltaMagnitude` is computed from the actual current value, not from the client payload.
 * - Throws `TRAIT_DELTA_EXCEEDS_BOUND` if the resulting magnitude exceeds `MAX_TRAIT_DELTA`.
 */
export function resolveTraitDeltaAgainstState(
  currentValue: number | undefined,
  delta: TraitDeltaEntry,
): ResolvedTraitDelta {
  if (typeof currentValue !== "number" || Number.isNaN(currentValue)) {
    throw new ValidationError(
      "TRAIT_DIMENSION_NOT_INITIALIZED",
      `Trait dimension ${delta.dimension} is not initialized for this character`,
      "dimension",
    );
  }
  if (delta.oldValue !== undefined && Math.abs(delta.oldValue - currentValue) > TRAIT_OLD_VALUE_TOLERANCE) {
    throw new ValidationError(
      "TRAIT_OLD_VALUE_MISMATCH",
      `Trait oldValue ${delta.oldValue} does not match current value ${currentValue} for dimension ${delta.dimension}`,
      "oldValue",
    );
  }
  const magnitude = Math.abs(delta.newValue - currentValue);
  if (magnitude > MAX_TRAIT_DELTA + TRAIT_BOUND_TOLERANCE) {
    throw new ValidationError(
      "TRAIT_DELTA_EXCEEDS_BOUND",
      `Trait delta ${magnitude.toFixed(3)} exceeds max ${MAX_TRAIT_DELTA} for dimension ${delta.dimension}`,
      "deltaMagnitude",
    );
  }
  return {
    dimension: delta.dimension,
    oldValue: currentValue,
    newValue: delta.newValue,
    evidence: delta.evidence,
    deltaMagnitude: magnitude,
  };
}

/** Returns the default trait value for a given subtype / dimension, or undefined if not applicable. */
export function getDefaultTraitValue(
  subtype: CharacterSubtype | string,
  dimension: TraitDimension,
): number | undefined {
  if (subtype === "npc") return DEFAULT_NPC_TRAITS[dimension];
  if (subtype === "child_avatar") return DEFAULT_CHILD_AVATAR_TRAITS[dimension];
  return undefined;
}

export function validateCharacterSubtype(value: string): CharacterSubtype {
  if (!(CHARACTER_SUBTYPES as readonly string[]).includes(value as CharacterSubtype)) {
    throw new ValidationError("INVALID_CHARACTER_SUBTYPE", `Character subtype must be one of: ${CHARACTER_SUBTYPES.join(", ")}`, "characterSubtype");
  }
  return value as CharacterSubtype;
}

export function validateCharacterLifecycleStage(value: string): CharacterLifecycleStage {
  if (!(CHARACTER_LIFECYCLE_STAGES as readonly string[]).includes(value as CharacterLifecycleStage)) {
    throw new ValidationError("INVALID_LIFECYCLE_STAGE", `Lifecycle stage must be one of: ${CHARACTER_LIFECYCLE_STAGES.join(", ")}`, "lifecycleStage");
  }
  return value as CharacterLifecycleStage;
}

export const DEFAULT_CHILD_AVATAR_TRAITS: TraitVector = {
  courage: 0.5,
  curiosity: 0.6,
  compassion: 0.5,
  patience: 0.4,
  optimism: 0.6,
  creativity: 0.5,
  discipline: 0.3,
  honesty: 0.6,
  independence: 0.3,
  sociability: 0.5,
};

export const DEFAULT_CHILD_AVATAR_EMOTIONS: EmotionVector = {
  joy: 0.6,
  sadness: 0.1,
  fear: 0.2,
  anger: 0.1,
  surprise: 0.3,
  trust: 0.5,
};

export const DEFAULT_NPC_TRAITS: TraitVector = {
  courage: 0.5,
  curiosity: 0.4,
  compassion: 0.5,
  patience: 0.6,
  optimism: 0.5,
  creativity: 0.4,
  discipline: 0.6,
  honesty: 0.5,
  independence: 0.5,
  sociability: 0.5,
};

export const DEFAULT_NPC_EMOTIONS: EmotionVector = {
  joy: 0.4,
  sadness: 0.2,
  fear: 0.2,
  anger: 0.1,
  surprise: 0.2,
  trust: 0.4,
};

export function createDefaultInfluenceVector(): InfluenceVector {
  return {
    emotional: 0,
    social: 0,
    cultural: 0,
    educational: 0,
    political: 0,
    environmental: 0,
    familial: 0,
    spiritual: 0,
    historical: 0,
  };
}
