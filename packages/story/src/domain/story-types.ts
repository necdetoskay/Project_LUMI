import { ValidationError } from "./errors";

export const STORY_DEFINITION_LIFECYCLE = [
  "draft",
  "review",
  "published",
  "retired",
  "archived",
] as const;
export type StoryDefinitionLifecycle = (typeof STORY_DEFINITION_LIFECYCLE)[number];

export const STORY_TYPES = [
  "static",
  "interactive",
  "continuing",
  "world_event",
  "educational",
  "reflection",
] as const;
export type StoryType = (typeof STORY_TYPES)[number];

export const STORY_SOURCE_TYPES = [
  "generated",
  "authored",
  "imported",
  "adapted",
] as const;
export type StorySourceType = (typeof STORY_SOURCE_TYPES)[number];

export const STORY_MODES = ["static", "interactive"] as const;
export type StoryMode = (typeof STORY_MODES)[number];

export const STORY_VERSION_STATUS = [
  "draft",
  "frozen",
  "published",
  "retired",
] as const;
export type StoryVersionStatus = (typeof STORY_VERSION_STATUS)[number];

export const SCENE_TYPES = [
  "narrative",
  "choice",
  "transition",
  "challenge",
  "ending",
  "reflection",
  "system",
] as const;
export type SceneType = (typeof SCENE_TYPES)[number];

export const TRANSITION_TYPES = [
  "automatic",
  "conditional",
  "choice",
  "fallback",
] as const;
export type TransitionType = (typeof TRANSITION_TYPES)[number];

export const SESSION_STATUSES = [
  "created",
  "active",
  "paused",
  "completed",
  "abandoned",
  "failed",
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const PLAYBACK_MODES = ["reading", "narrated", "mixed"] as const;
export type PlaybackMode = (typeof PLAYBACK_MODES)[number];

export const PARTICIPATION_ROLES = [
  "protagonist",
  "companion",
  "guide",
  "antagonist",
  "guest",
] as const;
export type ParticipationRole = (typeof PARTICIPATION_ROLES)[number];

export const CHECKPOINT_TYPES = [
  "automatic",
  "manual",
  "choice",
  "chapter",
  "recovery",
] as const;
export type CheckpointType = (typeof CHECKPOINT_TYPES)[number];

export const STORY_EVENT_TYPES = [
  "STORY_DEFINITION_CREATED",
  "STORY_VERSION_CREATED",
  "STORY_VERSION_PUBLISHED",
  "STORY_VERSION_RETIRED",
  "STORY_SESSION_CREATED",
  "STORY_SESSION_STARTED",
  "STORY_SCENE_ENTERED",
  "STORY_SESSION_PAUSED",
  "STORY_SESSION_RESUMED",
  "STORY_SESSION_COMPLETED",
  "STORY_SESSION_ABANDONED",
  "STORY_CHECKPOINT_CREATED",
  "STORY_CHOICE_COMMITTED",
] as const;
export type StoryEventType = (typeof STORY_EVENT_TYPES)[number];

export interface StoryDefinitionState {
  id: string;
  householdId: string;
  childProfileId: string | null;
  title: string;
  slug: string;
  storyType: StoryType;
  sourceType: StorySourceType;
  lifecycle: StoryDefinitionLifecycle;
  currentPublishedVersionId: string | null;
  ageGroup: string;
  defaultLanguage: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface StoryVersionState {
  id: string;
  storyDefinitionId: string;
  versionNumber: number;
  publicationStatus: StoryVersionStatus;
  schemaVersion: number;
  title: string;
  summary: string | null;
  storyMode: StoryMode;
  contentHash: string | null;
  createdAt: Date;
  frozenAt: Date | null;
  publishedAt: Date | null;
  retiredAt: Date | null;
}

export interface StorySceneState {
  id: string;
  storyVersionId: string;
  sceneKey: string;
  sequenceNumber: number;
  sceneType: SceneType;
  title: string | null;
  narrativeText: string;
  isEntryScene: boolean;
  isTerminalScene: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface StorySceneTransitionState {
  id: string;
  storyVersionId: string;
  fromSceneId: string;
  toSceneId: string;
  transitionType: TransitionType;
  priority: number;
  createdAt: Date;
}

export interface StorySessionState {
  id: string;
  householdId: string;
  childProfileId: string;
  worldId: string;
  storyDefinitionId: string;
  storyVersionId: string;
  currentSceneId: string | null;
  sessionStatus: SessionStatus;
  playbackMode: PlaybackMode;
  startedAt: Date | null;
  lastInteractedAt: Date | null;
  pausedAt: Date | null;
  completedAt: Date | null;
  abandonmentReason: string | null;
  contextSnapshot: Record<string, unknown>;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StorySessionCharacterState {
  storySessionId: string;
  characterId: string;
  participationRole: ParticipationRole;
  joinedAt: Date;
  initialStateSnapshot: Record<string, unknown>;
  version: number;
}

export interface StorySessionCheckpointState {
  id: string;
  storySessionId: string;
  sceneId: string;
  checkpointType: CheckpointType;
  schemaVersion: number;
  sessionState: Record<string, unknown>;
  contentHash: string;
  sequenceNumber: number;
  createdAt: Date;
}

export function assertKnownLifecycle(lifecycle: string): asserts lifecycle is StoryDefinitionLifecycle {
  if (!(STORY_DEFINITION_LIFECYCLE as readonly string[]).includes(lifecycle)) {
    throw new ValidationError("INVALID_STORY_LIFECYCLE", `Invalid story definition lifecycle: ${lifecycle}`);
  }
}

export function assertKnownSessionStatus(status: string): asserts status is SessionStatus {
  if (!(SESSION_STATUSES as readonly string[]).includes(status)) {
    throw new ValidationError("INVALID_SESSION_STATUS", `Invalid session status: ${status}`);
  }
}

export function assertKnownStoryType(value: string): asserts value is StoryType {
  if (!(STORY_TYPES as readonly string[]).includes(value)) {
    throw new ValidationError("INVALID_STORY_TYPE", `Invalid story type: ${value}`);
  }
}

export function assertKnownSourceType(value: string): asserts value is StorySourceType {
  if (!(STORY_SOURCE_TYPES as readonly string[]).includes(value)) {
    throw new ValidationError("INVALID_SOURCE_TYPE", `Invalid source type: ${value}`);
  }
}

export function assertKnownStoryVersionStatus(value: string): asserts value is StoryVersionStatus {
  if (!(STORY_VERSION_STATUS as readonly string[]).includes(value)) {
    throw new ValidationError("INVALID_VERSION_STATUS", `Invalid story version status: ${value}`);
  }
}

export function assertKnownStoryMode(value: string): asserts value is StoryMode {
  if (!(STORY_MODES as readonly string[]).includes(value)) {
    throw new ValidationError("INVALID_STORY_MODE", `Invalid story mode: ${value}`);
  }
}

export function assertKnownPlaybackMode(value: string): asserts value is PlaybackMode {
  if (!(PLAYBACK_MODES as readonly string[]).includes(value)) {
    throw new ValidationError("INVALID_PLAYBACK_MODE", `Invalid playback mode: ${value}`);
  }
}

export function assertKnownSceneType(value: string): asserts value is SceneType {
  if (!(SCENE_TYPES as readonly string[]).includes(value)) {
    throw new ValidationError("INVALID_SCENE_TYPE", `Invalid scene type: ${value}`);
  }
}

export function assertKnownTransitionType(value: string): asserts value is TransitionType {
  if (!(TRANSITION_TYPES as readonly string[]).includes(value)) {
    throw new ValidationError("INVALID_TRANSITION_TYPE", `Invalid transition type: ${value}`);
  }
}