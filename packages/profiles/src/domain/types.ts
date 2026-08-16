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

export const BROAD_CHARACTER_KINDS = [
  "human",
  "animal",
  "fantasy",
  "robot",
  "sea_creature",
  "sky_creature",
] as const;
export type BroadCharacterKind = (typeof BROAD_CHARACTER_KINDS)[number];

export const CHARACTER_TYPE_TO_KIND: Record<
  CharacterType,
  BroadCharacterKind[]
> = {
  explorer: ["human", "fantasy", "robot"],
  inventor: ["human", "robot", "fantasy"],
  storyteller: ["human", "fantasy"],
  helper: ["human", "animal", "fantasy"],
  dreamer: ["fantasy", "sky_creature", "sea_creature"],
};

export interface ChildProfileMetadata {
  preferredName?: string;
  ageYears?: number;
  accessibility?: Record<string, boolean>;
}

export interface StoryPreferenceMetadata {
  preferredThemes?: string[];
  avoidedThemes?: string[];
  favoriteCharacterTypes?: string[];
}

export type ToneVector =
  | "wonder"
  | "warmth"
  | "mystery"
  | "humor"
  | "courage"
  | "curiosity";

export interface SafetyBounds {
  ageBand: AgeBand;
  contentBoundary: "strict" | "moderate" | "open";
  requireParentApprovalForAi: boolean;
}

export interface OriginPackage {
  id: string;
  childProfileId: string;
  broadKind: BroadCharacterKind;
  characterType: CharacterType;
  subtype: string;
  originConcept: string;
  startingRegionArchetype: string;
  startingLocation: string;
  homeArchetype: string;
  nearbyNpcSeed: string;
  firstMysterySeed: string;
  toneVector: ToneVector[];
  safetyBounds: SafetyBounds;
  noveltyMarkers: string[];
  originMode: OriginMode;
  universeSeed: string;
  createdBy: "system" | "parent" | "child";
}

export const TONE_VECTORS: ToneVector[] = [
  "wonder",
  "warmth",
  "mystery",
  "humor",
  "courage",
  "curiosity",
];

export const CHARACTER_SUBTYPES = ["child_avatar", "npc"] as const;
export type CharacterSubtype = (typeof CHARACTER_SUBTYPES)[number];

export const CHARACTER_LIFECYCLE_STAGES = [
  "newborn",
  "childhood",
  "adolescence",
  "adulthood",
  "elder",
] as const;
export type CharacterLifecycleStage =
  (typeof CHARACTER_LIFECYCLE_STAGES)[number];

export const TRAIT_DIMENSIONS = [
  "courage",
  "curiosity",
  "compassion",
  "patience",
  "optimism",
  "creativity",
  "discipline",
  "honesty",
  "independence",
  "sociability",
] as const;
export type TraitDimension = (typeof TRAIT_DIMENSIONS)[number];

export const EMOTION_DIMENSIONS = [
  "joy",
  "sadness",
  "fear",
  "anger",
  "surprise",
  "trust",
] as const;
export type EmotionDimension = (typeof EMOTION_DIMENSIONS)[number];

export const NEED_TYPES = [
  "hunger",
  "rest",
  "safety",
  "belonging",
  "learning",
  "achievement",
  "curiosity",
  "love",
  "purpose",
  "freedom",
] as const;
export type NeedType = (typeof NEED_TYPES)[number];
