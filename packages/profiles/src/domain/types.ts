export const AGE_BANDS = ["3-5", "6-8", "9-12", "13+"] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

export const MEMBERSHIP_ROLES = ["owner", "guardian", "member"] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export const STORY_LENGTHS = ["short", "medium", "long"] as const;
export type StoryLength = (typeof STORY_LENGTHS)[number];

export const CHARACTER_TYPES = [
  "explorer",
  "inventor",
  "storyteller",
  "helper",
  "dreamer",
] as const;
export type CharacterType = (typeof CHARACTER_TYPES)[number];

export const ORIGIN_MODES = ["manual", "auto"] as const;
export type OriginMode = (typeof ORIGIN_MODES)[number];

export interface ChildProfileMetadata {
  preferredName?: string;
  accessibility?: Record<string, boolean>;
}

export interface StoryPreferenceMetadata {
  preferredThemes?: string[];
  avoidedThemes?: string[];
  favoriteCharacterTypes?: string[];
}
