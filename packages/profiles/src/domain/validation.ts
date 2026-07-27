import {
  AGE_BANDS,
  MEMBERSHIP_ROLES,
  STORY_LENGTHS,
  type AgeBand,
  type MembershipRole,
  type StoryLength,
} from "./types";
import { ValidationError } from "./errors";

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validateAgeBand(value: string): AgeBand {
  const band = AGE_BANDS.find((b) => b === value);
  if (!band) {
    throw new ValidationError(
      "INVALID_AGE_BAND",
      `Age band must be one of: ${AGE_BANDS.join(", ")}`,
      "ageBand",
    );
  }
  return band;
}

export function validateMembershipRole(value: string): MembershipRole {
  const role = MEMBERSHIP_ROLES.find((r) => r === value);
  if (!role) {
    throw new ValidationError(
      "INVALID_MEMBERSHIP_ROLE",
      `Role must be one of: ${MEMBERSHIP_ROLES.join(", ")}`,
      "membershipRole",
    );
  }
  return role;
}

export function validateDisplayName(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 120) {
    throw new ValidationError(
      "INVALID_DISPLAY_NAME",
      "Display name must be between 1 and 120 characters",
      "displayName",
    );
  }
  return trimmed;
}

export function validateHouseholdName(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 160) {
    throw new ValidationError(
      "INVALID_HOUSEHOLD_NAME",
      "Household name must be between 1 and 160 characters",
      "name",
    );
  }
  return trimmed;
}

export function validateSlug(value: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new ValidationError(
      "INVALID_SLUG",
      "Slug must be lowercase alphanumeric with hyphens",
      "slug",
    );
  }
  if (value.length < 2 || value.length > 180) {
    throw new ValidationError(
      "INVALID_SLUG_LENGTH",
      "Slug must be between 2 and 180 characters",
      "slug",
    );
  }
  return value;
}

export function validateStoryLength(value: string): StoryLength {
  const length = STORY_LENGTHS.find((l) => l === value);
  if (!length) {
    throw new ValidationError(
      "INVALID_STORY_LENGTH",
      `Story length must be one of: ${STORY_LENGTHS.join(", ")}`,
      "storyLength",
    );
  }
  return length;
}

export function validateInteractionLevel(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 5) {
    throw new ValidationError(
      "INVALID_INTERACTION_LEVEL",
      "Interaction level must be an integer between 0 and 5",
      "interactionLevel",
    );
  }
  return value;
}

export function validateCharacterOriginHandoff(input: {
  childProfileId: string;
  characterType: string;
  originMode: string;
}): void {
  const VALID_TYPES = [
    "explorer",
    "inventor",
    "storyteller",
    "helper",
    "dreamer",
  ] as const;
  const VALID_MODES = ["manual", "auto"] as const;

  if (!input.childProfileId) {
    throw new ValidationError(
      "MISSING_CHILD_PROFILE_ID",
      "Child profile ID is required",
      "childProfileId",
    );
  }

  if (!(VALID_TYPES as readonly string[]).includes(input.characterType)) {
    throw new ValidationError(
      "INVALID_CHARACTER_TYPE",
      `Character type must be one of: ${VALID_TYPES.join(", ")}`,
      "characterType",
    );
  }

  if (!(VALID_MODES as readonly string[]).includes(input.originMode)) {
    throw new ValidationError(
      "INVALID_ORIGIN_MODE",
      `Origin mode must be one of: ${VALID_MODES.join(", ")}`,
      "originMode",
    );
  }
}
