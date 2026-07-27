import {
  validateAgeBand,
  validateCharacterOriginHandoff,
  validateDisplayName,
  validateInteractionLevel,
  validateStoryLength,
} from "./validation";
import type {
  AgeBand,
  CharacterType,
  ChildProfileMetadata,
  OriginMode,
  StoryLength,
  StoryPreferenceMetadata,
} from "./types";
import { ValidationError } from "./errors";

export interface ChildProfileState {
  id: string;
  householdId: string;
  displayName: string;
  ageBand: AgeBand;
  locale: string;
  avatarAssetId: string | null;
  metadata: ChildProfileMetadata;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ChildPreferencesState {
  childProfileId: string;
  storyLength: StoryLength;
  interactionLevel: number;
  imageEnabled: boolean;
  audioEnabled: boolean;
  metadata: StoryPreferenceMetadata;
}

export class ChildProfile {
  private state: ChildProfileState;
  private preferences: ChildPreferencesState;
  private characterHandoff: CharacterOriginHandoff | null = null;

  private constructor(
    state: ChildProfileState,
    preferences?: Partial<ChildPreferencesState>,
  ) {
    this.state = { ...state };
    this.preferences = {
      childProfileId: state.id,
      storyLength: "medium",
      interactionLevel: 2,
      imageEnabled: true,
      audioEnabled: false,
      metadata: {},
      ...preferences,
    };
  }

  static create(input: {
    id: string;
    householdId: string;
    displayName: string;
    ageBand: string;
    locale?: string;
    metadata?: ChildProfileMetadata;
    preferences?: Partial<ChildPreferencesState>;
  }): ChildProfile {
    const displayName = validateDisplayName(input.displayName);
    const ageBand = validateAgeBand(input.ageBand);

    return new ChildProfile(
      {
        id: input.id,
        householdId: input.householdId,
        displayName,
        ageBand,
        locale: input.locale ?? "tr-TR",
        avatarAssetId: null,
        metadata: input.metadata ?? {},
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      input.preferences,
    );
  }

  static fromState(
    state: ChildProfileState,
    preferences?: Partial<ChildPreferencesState>,
  ): ChildProfile {
    const profile = new ChildProfile(state, preferences);
    return profile;
  }

  getState(): ChildProfileState {
    return { ...this.state };
  }

  getPreferences(): ChildPreferencesState {
    return { ...this.preferences };
  }

  isArchived(): boolean {
    return this.state.deletedAt !== null;
  }

  archive(): void {
    this.state.deletedAt = new Date();
  }

  updateDisplayName(name: string): void {
    this.state.displayName = validateDisplayName(name);
    this.state.updatedAt = new Date();
  }

  updateAgeBand(band: string): void {
    this.state.ageBand = validateAgeBand(band);
    this.state.updatedAt = new Date();
  }

  updateMetadata(metadata: ChildProfileMetadata): void {
    this.state.metadata = { ...metadata };
    this.state.updatedAt = new Date();
  }

  updatePreferences(prefs: Partial<ChildPreferencesState>): void {
    if (prefs.storyLength !== undefined) {
      this.preferences.storyLength = validateStoryLength(prefs.storyLength);
    }
    if (prefs.interactionLevel !== undefined) {
      this.preferences.interactionLevel = validateInteractionLevel(
        prefs.interactionLevel,
      );
    }
    if (prefs.imageEnabled !== undefined) {
      this.preferences.imageEnabled = prefs.imageEnabled;
    }
    if (prefs.audioEnabled !== undefined) {
      this.preferences.audioEnabled = prefs.audioEnabled;
    }
    if (prefs.metadata !== undefined) {
      this.preferences.metadata = { ...prefs.metadata };
    }
    this.state.updatedAt = new Date();
  }

  setCharacterOriginHandoff(handoff: CharacterOriginHandoff): void {
    if (this.state.deletedAt) {
      throw new ValidationError(
        "PROFILE_ARCHIVED",
        "Cannot set character origin on an archived profile",
      );
    }

    validateCharacterOriginHandoff({
      childProfileId: handoff.childProfileId,
      characterType: handoff.characterType,
      originMode: handoff.originMode,
    });

    this.characterHandoff = handoff.preferenceHints
      ? {
          ...handoff,
          preferenceHints: { ...handoff.preferenceHints },
        }
      : {
          childProfileId: handoff.childProfileId,
          characterType: handoff.characterType,
          originMode: handoff.originMode,
        };
  }

  getCharacterOriginHandoff(): CharacterOriginHandoff | null {
    if (!this.characterHandoff) {
      return null;
    }

    return this.characterHandoff.preferenceHints
      ? {
          ...this.characterHandoff,
          preferenceHints: { ...this.characterHandoff.preferenceHints },
        }
      : {
          childProfileId: this.characterHandoff.childProfileId,
          characterType: this.characterHandoff.characterType,
          originMode: this.characterHandoff.originMode,
        };
  }

  ownsHousehold(householdId: string): boolean {
    return this.state.householdId === householdId;
  }
}

export interface CharacterOriginHandoff {
  childProfileId: string;
  characterType: CharacterType;
  originMode: OriginMode;
  preferenceHints?: StoryPreferenceMetadata;
}
