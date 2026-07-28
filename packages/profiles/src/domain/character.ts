import type {
  AgeBand,
  BroadCharacterKind,
  CharacterType,
  OriginMode,
  OriginPackage,
  SafetyBounds,
  StoryPreferenceMetadata,
} from "./types";
import { ValidationError } from "./errors";
import {
  validateCharacterOriginHandoff,
} from "./validation";

function cleanPreferenceHints(
  input: StoryPreferenceMetadata | undefined,
): StoryPreferenceMetadata | undefined {
  if (!input) return undefined;
  const out: StoryPreferenceMetadata = {};
  if (Array.isArray(input.preferredThemes) && input.preferredThemes.length > 0) {
    out.preferredThemes = [...input.preferredThemes];
  }
  if (Array.isArray(input.avoidedThemes) && input.avoidedThemes.length > 0) {
    out.avoidedThemes = [...input.avoidedThemes];
  }
  if (Array.isArray(input.favoriteCharacterTypes) && input.favoriteCharacterTypes.length > 0) {
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
    if (!input.name || input.name.trim().length < 1 || input.name.length > 120) {
      throw new ValidationError(
        "INVALID_CHARACTER_NAME",
        "Character name must be between 1 and 120 characters",
        "name",
      );
    }
    if (!input.subtype || input.subtype.trim().length < 1 || input.subtype.length > 80) {
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
