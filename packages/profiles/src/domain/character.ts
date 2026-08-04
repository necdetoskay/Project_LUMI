import type {
  AgeBand,
  BroadCharacterKind,
  CharacterType,
  OriginMode,
  OriginPackage,
  SafetyBounds,
  StoryPreferenceMetadata,
  CharacterSubtype,
  CharacterLifecycleStage,
} from "./types";
import { ValidationError } from "./errors";
import { validateCharacterOriginHandoff } from "./validation";
import {
  validateTraitVector,
  validateEmotionVector,
  validateNeeds,
  validateGoals,
  validateInfluenceVector,
  validateRelationships,
  validateTraitDelta,
  resolveTraitDeltaAgainstState,
  validateCharacterSubtype,
  validateCharacterLifecycleStage,
  type TraitVector,
  type EmotionVector,
  type NeedState,
  type GoalState,
  type InfluenceVector,
  type DirectionalRelationship,
  type TraitDeltaEntry,
  type ResolvedTraitDelta,
  DEFAULT_CHILD_AVATAR_TRAITS,
  DEFAULT_CHILD_AVATAR_EMOTIONS,
  DEFAULT_NPC_TRAITS,
  DEFAULT_NPC_EMOTIONS,
  createDefaultInfluenceVector,
} from "./character-domain";

function cleanPreferenceHints(
  input: StoryPreferenceMetadata | undefined,
): StoryPreferenceMetadata | undefined {
  if (!input) return undefined;
  const out: StoryPreferenceMetadata = {};
  if (
    Array.isArray(input.preferredThemes) &&
    input.preferredThemes.length > 0
  ) {
    out.preferredThemes = [...input.preferredThemes];
  }
  if (Array.isArray(input.avoidedThemes) && input.avoidedThemes.length > 0) {
    out.avoidedThemes = [...input.avoidedThemes];
  }
  if (
    Array.isArray(input.favoriteCharacterTypes) &&
    input.favoriteCharacterTypes.length > 0
  ) {
    out.favoriteCharacterTypes = [...input.favoriteCharacterTypes];
  }
  return out;
}

export interface CharacterState {
  id: string;
  childProfileId: string;
  householdId: string;
  name: string;
  broadKind: BroadCharacterKind;
  characterType: CharacterType;
  subtype: string;
  originMode: OriginMode;
  firstOriginPackageId: string;
  originConcept: string;
  startingRegionArchetype: string;
  startingLocation: string;
  homeArchetype: string;
  nearbyNpcSeed: string;
  firstMysterySeed: string;
  universeSeed: string;
  safetyBounds: SafetyBounds;
  preferenceHints?: StoryPreferenceMetadata;
  characterSubtype: CharacterSubtype;
  lifecycleStage: CharacterLifecycleStage;
  activeLocationId: string | null;
  activeLocationType: string | null;
  version: number;
  traits: TraitVector;
  emotions: EmotionVector;
  needs: NeedState[];
  goals: GoalState[];
  influence: InfluenceVector;
  relationships: DirectionalRelationship[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class LumiCharacter {
  private state: CharacterState;

  private constructor(state: CharacterState) {
    this.state = { ...state };
  }

  static create(input: {
    id: string;
    childProfileId: string;
    householdId: string;
    name: string;
    broadKind: BroadCharacterKind;
    characterType: CharacterType;
    subtype: string;
    originMode: OriginMode;
    firstOriginPackageId: string;
    originConcept: string;
    startingRegionArchetype: string;
    startingLocation: string;
    homeArchetype: string;
    nearbyNpcSeed: string;
    firstMysterySeed: string;
    universeSeed: string;
    safetyBounds: SafetyBounds;
    preferenceHints?: StoryPreferenceMetadata;
    characterSubtype?: CharacterSubtype;
    lifecycleStage?: CharacterLifecycleStage;
    activeLocationId?: string | null;
    activeLocationType?: string | null;
    traits?: TraitVector;
    emotions?: EmotionVector;
    needs?: NeedState[];
    goals?: GoalState[];
    influence?: InfluenceVector;
    relationships?: DirectionalRelationship[];
  }): LumiCharacter {
    if (!input.id) {
      throw new ValidationError(
        "MISSING_CHARACTER_ID",
        "Character ID is required",
        "id",
      );
    }
    if (!input.childProfileId) {
      throw new ValidationError(
        "MISSING_CHILD_PROFILE_ID",
        "Child profile ID is required",
        "childProfileId",
      );
    }
    if (!input.householdId) {
      throw new ValidationError(
        "MISSING_HOUSEHOLD_ID",
        "Household ID is required",
        "householdId",
      );
    }
    if (
      !input.name ||
      input.name.trim().length < 1 ||
      input.name.length > 120
    ) {
      throw new ValidationError(
        "INVALID_CHARACTER_NAME",
        "Character name must be between 1 and 120 characters",
        "name",
      );
    }
    if (
      !input.subtype ||
      input.subtype.trim().length < 1 ||
      input.subtype.length > 80
    ) {
      throw new ValidationError(
        "INVALID_CHARACTER_SUBTYPE",
        "Character subtype must be between 1 and 80 characters",
        "subtype",
      );
    }
    if (!input.firstOriginPackageId) {
      throw new ValidationError(
        "MISSING_ORIGIN_PACKAGE_ID",
        "First origin package ID is required",
        "firstOriginPackageId",
      );
    }

    validateCharacterOriginHandoff({
      childProfileId: input.childProfileId,
      characterType: input.characterType,
      originMode: input.originMode,
    });

    const subtype = input.characterSubtype ?? "child_avatar";
    validateCharacterSubtype(subtype);
    const lifecycleStage = input.lifecycleStage ?? "childhood";
    validateCharacterLifecycleStage(lifecycleStage);

    const isChildAvatar = subtype === "child_avatar";
    const traits =
      input.traits ??
      (isChildAvatar
        ? { ...DEFAULT_CHILD_AVATAR_TRAITS }
        : { ...DEFAULT_NPC_TRAITS });
    const emotions =
      input.emotions ??
      (isChildAvatar
        ? { ...DEFAULT_CHILD_AVATAR_EMOTIONS }
        : { ...DEFAULT_NPC_EMOTIONS });
    const needs = input.needs ?? [];
    const goals = input.goals ?? [];
    const influence = input.influence ?? createDefaultInfluenceVector();
    const relationships = input.relationships ?? [];

    validateTraitVector(traits);
    validateEmotionVector(emotions);
    validateNeeds(needs);
    validateGoals(goals);
    validateInfluenceVector(influence);
    validateRelationships(relationships);

    if (
      isChildAvatar &&
      input.relationships &&
      input.relationships.length > 0
    ) {
      throw new ValidationError(
        "CHILD_AVATAR_NO_RELATIONSHIPS",
        "Child avatar cannot have relationships at creation",
        "relationships",
      );
    }

    const base: CharacterState = {
      id: input.id,
      childProfileId: input.childProfileId,
      householdId: input.householdId,
      name: input.name.trim(),
      broadKind: input.broadKind,
      characterType: input.characterType,
      subtype: input.subtype.trim(),
      originMode: input.originMode,
      firstOriginPackageId: input.firstOriginPackageId,
      originConcept: input.originConcept,
      startingRegionArchetype: input.startingRegionArchetype,
      startingLocation: input.startingLocation,
      homeArchetype: input.homeArchetype,
      nearbyNpcSeed: input.nearbyNpcSeed,
      firstMysterySeed: input.firstMysterySeed,
      universeSeed: input.universeSeed,
      safetyBounds: { ...input.safetyBounds },
      characterSubtype: subtype,
      lifecycleStage,
      activeLocationId: input.activeLocationId ?? null,
      activeLocationType: input.activeLocationType ?? null,
      version: 1,
      traits: { ...traits },
      emotions: { ...emotions },
      needs: needs.map((n) => ({ ...n })),
      goals: goals.map((g) => ({ ...g })),
      influence: { ...influence },
      relationships: relationships.map((r) => ({ ...r })),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    const hints = cleanPreferenceHints(input.preferenceHints);
    const state: CharacterState = hints
      ? { ...base, preferenceHints: hints }
      : base;

    return new LumiCharacter(state);
  }

  static fromState(state: CharacterState): LumiCharacter {
    return new LumiCharacter(state);
  }

  getState(): CharacterState {
    return { ...this.state };
  }

  isArchived(): boolean {
    return this.state.deletedAt !== null;
  }

  archive(): void {
    this.state.deletedAt = new Date();
    this.state.updatedAt = new Date();
  }

  rename(newName: string): void {
    const trimmed = newName.trim();
    if (trimmed.length < 1 || trimmed.length > 120) {
      throw new ValidationError(
        "INVALID_CHARACTER_NAME",
        "Character name must be between 1 and 120 characters",
        "name",
      );
    }
    this.state.name = trimmed;
    this.state.updatedAt = new Date();
  }

  applyTraitDelta(delta: TraitDeltaEntry): ResolvedTraitDelta {
    validateTraitDelta(delta);
    if (this.state.characterSubtype === "npc") {
      throw new ValidationError(
        "NPC_TRAIT_CHANGE_DISALLOWED",
        "NPC trait changes are out of scope",
        "characterSubtype",
      );
    }
    const currentValue = this.state.traits[delta.dimension];
    const resolved = resolveTraitDeltaAgainstState(currentValue, delta);
    this.state.traits[delta.dimension] = resolved.newValue;
    this.state.version += 1;
    this.state.updatedAt = new Date();
    return resolved;
  }

  applyTraitDeltas(deltas: TraitDeltaEntry[]): ResolvedTraitDelta[] {
    if (this.state.characterSubtype === "npc") {
      throw new ValidationError(
        "NPC_TRAIT_CHANGE_DISALLOWED",
        "NPC trait changes are out of scope",
        "characterSubtype",
      );
    }
    const seenDimensions = new Set<string>();
    for (const delta of deltas) {
      if (seenDimensions.has(delta.dimension)) {
        throw new ValidationError(
          "DUPLICATE_TRAIT_DELTA_DIMENSION",
          `Duplicate trait dimension "${delta.dimension}" in the same request; each dimension may only appear once per batch`,
          "dimension",
        );
      }
      seenDimensions.add(delta.dimension);
    }
    const resolved: ResolvedTraitDelta[] = [];
    for (const delta of deltas) {
      validateTraitDelta(delta);
      const currentValue = this.state.traits[delta.dimension];
      resolved.push(resolveTraitDeltaAgainstState(currentValue, delta));
    }
    for (const r of resolved) {
      this.state.traits[r.dimension] = r.newValue;
    }
    this.state.version += 1;
    this.state.updatedAt = new Date();
    return resolved;
  }

  updateEmotions(emotions: EmotionVector): void {
    validateEmotionVector(emotions);
    this.state.emotions = { ...emotions };
    this.state.version += 1;
    this.state.updatedAt = new Date();
  }

  addGoal(goal: GoalState): void {
    if (this.state.goals.filter((g) => g.status === "active").length >= 5) {
      throw new ValidationError(
        "MAX_ACTIVE_GOALS",
        "Character cannot have more than 5 active goals",
        "goals",
      );
    }
    validateGoals([goal]);
    this.state.goals.push({ ...goal });
    this.state.version += 1;
    this.state.updatedAt = new Date();
  }

  completeGoal(goalId: string): void {
    const goal = this.state.goals.find((g) => g.id === goalId);
    if (!goal) {
      throw new ValidationError(
        "GOAL_NOT_FOUND",
        `Goal ${goalId} not found`,
        "goalId",
      );
    }
    goal.status = "completed";
    goal.completedAt = new Date();
    this.state.version += 1;
    this.state.updatedAt = new Date();
  }

  updateNeeds(needs: NeedState[]): void {
    validateNeeds(needs);
    this.state.needs = needs.map((n) => ({ ...n }));
    this.state.version += 1;
    this.state.updatedAt = new Date();
  }

  setActiveLocation(locationId: string, locationType: string): void {
    if (!locationId) {
      throw new ValidationError(
        "MISSING_LOCATION_ID",
        "Active location ID is required",
        "activeLocationId",
      );
    }
    if (!locationType) {
      throw new ValidationError(
        "MISSING_LOCATION_TYPE",
        "Active location type is required",
        "activeLocationType",
      );
    }
    this.state.activeLocationId = locationId;
    this.state.activeLocationType = locationType;
    this.state.version += 1;
    this.state.updatedAt = new Date();
  }

  clearActiveLocation(): void {
    this.state.activeLocationId = null;
    this.state.activeLocationType = null;
    this.state.version += 1;
    this.state.updatedAt = new Date();
  }

  addRelationship(relationship: DirectionalRelationship): void {
    const existing = this.state.relationships.find(
      (r) => r.targetCharacterId === relationship.targetCharacterId,
    );
    if (existing) {
      throw new ValidationError(
        "RELATIONSHIP_ALREADY_EXISTS",
        `Relationship to ${relationship.targetCharacterId} already exists`,
        "targetCharacterId",
      );
    }
    if (this.state.characterSubtype === "child_avatar") {
      throw new ValidationError(
        "CHILD_AVATAR_NO_RELATIONSHIPS",
        "Child avatar cannot manage relationships directly",
        "characterSubtype",
      );
    }
    validateRelationships([relationship]);
    this.state.relationships.push({ ...relationship });
    this.state.version += 1;
    this.state.updatedAt = new Date();
  }

  updateRelationship(
    targetCharacterId: string,
    updates: Partial<
      Pick<
        DirectionalRelationship,
        | "trust"
        | "affinity"
        | "familiarity"
        | "relationshipType"
        | "customTypeLabel"
      >
    >,
  ): void {
    const existing = this.state.relationships.find(
      (r) => r.targetCharacterId === targetCharacterId,
    );
    if (!existing) {
      throw new ValidationError(
        "RELATIONSHIP_NOT_FOUND",
        `Relationship to ${targetCharacterId} not found`,
        "targetCharacterId",
      );
    }
    Object.assign(existing, updates);
    this.state.version += 1;
    this.state.updatedAt = new Date();
  }

  setLifecycleStage(stage: CharacterLifecycleStage): void {
    validateCharacterLifecycleStage(stage);
    if (
      this.state.characterSubtype === "child_avatar" &&
      stage !== "childhood"
    ) {
      throw new ValidationError(
        "CHILD_AVATAR_LIFECYCLE_FIXED",
        "Child avatar lifecycle stage is fixed to childhood",
        "lifecycleStage",
      );
    }
    this.state.lifecycleStage = stage;
    this.state.version += 1;
    this.state.updatedAt = new Date();
  }

  getVersion(): number {
    return this.state.version;
  }

  isChildAvatar(): boolean {
    return this.state.characterSubtype === "child_avatar";
  }

  isNpc(): boolean {
    return this.state.characterSubtype === "npc";
  }
}

export function validateSafetyBounds(
  bounds: SafetyBounds,
  ageBand: AgeBand,
): void {
  if (!bounds.ageBand) {
    throw new ValidationError(
      "MISSING_AGE_BAND_IN_SAFETY",
      "Age band is required in safety bounds",
      "safetyBounds.ageBand",
    );
  }
  if (bounds.ageBand !== ageBand) {
    throw new ValidationError(
      "SAFETY_AGE_MISMATCH",
      "Safety bounds age band must match the child profile age band",
      "safetyBounds.ageBand",
    );
  }
}

export function matchesOriginPackageContract(pkg: OriginPackage): void {
  if (!pkg.childProfileId) {
    throw new ValidationError(
      "MISSING_CHILD_PROFILE_ID",
      "Origin package requires childProfileId",
      "originPackage.childProfileId",
    );
  }
  if (!pkg.id) {
    throw new ValidationError(
      "MISSING_ORIGIN_PACKAGE_ID",
      "Origin package requires id",
      "originPackage.id",
    );
  }
  if (!pkg.subtype || pkg.subtype.length > 80) {
    throw new ValidationError(
      "INVALID_ORIGIN_SUBTYPE",
      "Origin package subtype invalid",
      "originPackage.subtype",
    );
  }
  if (!pkg.originConcept || pkg.originConcept.length > 500) {
    throw new ValidationError(
      "INVALID_ORIGIN_CONCEPT",
      "Origin concept required and must be <= 500 chars",
      "originPackage.originConcept",
    );
  }
  if (!pkg.universeSeed || pkg.universeSeed.length > 120) {
    throw new ValidationError(
      "INVALID_UNIVERSE_SEED",
      "Universe seed is required in origin package",
      "originPackage.universeSeed",
    );
  }
}
