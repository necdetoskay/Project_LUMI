export const WORLD_LIFECYCLE_STATUSES = [
  "active",
  "paused",
  "frozen",
  "archived",
] as const;
export type WorldLifecycleStatus = (typeof WORLD_LIFECYCLE_STATUSES)[number];

export const REGION_ACCESSIBILITY_STATUSES = [
  "open",
  "restricted",
  "blocked",
  "dangerous",
] as const;
export type RegionAccessibilityStatus =
  (typeof REGION_ACCESSIBILITY_STATUSES)[number];

export const DISCOVERY_STATUSES = [
  "unknown",
  "rumored",
  "discovered",
  "explored",
] as const;
export type DiscoveryStatus = (typeof DISCOVERY_STATUSES)[number];

export const LOCATION_ACCESSIBILITY_STATUSES = [
  "open",
  "restricted",
  "blocked",
  "dangerous",
] as const;
export type LocationAccessibilityStatus =
  (typeof LOCATION_ACCESSIBILITY_STATUSES)[number];

export const OCCUPANCY_LEVELS = [
  "empty",
  "sparse",
  "moderate",
  "crowded",
] as const;
export type OccupancyLevel = (typeof OCCUPANCY_LEVELS)[number];

export const SAFETY_LEVELS = ["safe", "caution", "risky", "dangerous"] as const;
export type SafetyLevel = (typeof SAFETY_LEVELS)[number];

export const HOME_TYPES = ["permanent", "temporary", "safe_haven"] as const;
export type HomeType = (typeof HOME_TYPES)[number];

export const RESIDENCE_TYPES = ["primary", "secondary", "guest"] as const;
export type ResidenceType = (typeof RESIDENCE_TYPES)[number];

export const REGION_TYPES = [
  "wilderness",
  "settlement",
  "water",
  "mountain",
  "forest",
  "sky",
  "underground",
  "magical",
  "urban",
  "coastal",
  "island",
  "custom",
] as const;
export type RegionType = (typeof REGION_TYPES)[number];

export const LOCATION_TYPES = [
  "town_square",
  "path",
  "building",
  "cave",
  "beach",
  "river_bank",
  "tree_house",
  "workshop",
  "market",
  "garden",
  "lookout",
  "dock",
  "reef",
  "lagoon",
  "coral_house",
  "cloud_platform",
  "nest",
  "den",
  "room",
  "custom",
] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export const MOVE_TYPES = ["arrival", "movement", "return_home"] as const;
export type MoveType = (typeof MOVE_TYPES)[number];

export const WORLD_EVENT_TYPES = [
  "WORLD_CREATED",
  "WORLD_ARCHIVED",
  "REGION_ADDED",
  "REGION_UPDATED",
  "LOCATION_ADDED",
  "LOCATION_UPDATED",
  "HOME_CREATED",
  "HOME_UPDATED",
  "CHARACTER_ARRIVED",
  "CHARACTER_MOVED",
  "CHARACTER_RETURNED_HOME",
  "CHECKPOINT_CREATED",
] as const;
export type WorldEventType = (typeof WORLD_EVENT_TYPES)[number];

export interface WorldState {
  id: string;
  householdId: string;
  childProfileId: string;
  characterId: string;
  universeSeed: string;
  originSeed: string;
  acceptedCandidateSeed: string;
  generatorVersion: string;
  vectorVersion: string;
  lifecycleStatus: WorldLifecycleStatus;
  version: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface RegionState {
  id: string;
  worldId: string;
  regionKey: string;
  displayName: string;
  regionType: RegionType;
  accessibilityStatus: RegionAccessibilityStatus;
  discoveryStatus: DiscoveryStatus;
  environmentVector: Record<string, number>;
  subregionOf: string | null;
  sortOrder: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocationState {
  id: string;
  worldId: string;
  regionId: string;
  locationKey: string;
  displayName: string;
  accessibilityStatus: LocationAccessibilityStatus;
  locationType: LocationType;
  occupancyLevel: OccupancyLevel;
  safetyLevel: SafetyLevel;
  isHome: boolean;
  metadata: Record<string, unknown>;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface HomeState {
  id: string;
  worldId: string;
  locationId: string;
  homeType: HomeType;
  displayName: string;
  residenceType: ResidenceType;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CharacterLocationState {
  characterId: string;
  worldId: string;
  locationId: string;
  enteredAt: Date;
  version: number;
}

export interface CharacterMovementEventState {
  id: string;
  characterId: string;
  worldId: string;
  fromLocationId: string | null;
  toLocationId: string;
  moveType: MoveType;
  createdAt: Date;
}

export interface WorldBootstrapManifestState {
  id: string;
  worldId: string;
  universeSeed: string;
  originSeed: string;
  acceptedCandidateSeed: string;
  generatorVersion: string;
  vectorVersion: string;
  originPackagePayload: Record<string, unknown>;
  createdAt: Date;
}

export interface WorldCheckpointState {
  id: string;
  worldId: string;
  checkpointSequence: number;
  worldVersion: number;
  stateHash: string;
  description: string | null;
  createdAt: Date;
}

export const QUEST_STATUSES = [
  "inactive",
  "active",
  "paused",
  "completed",
  "abandoned",
] as const;
export type QuestStatus = (typeof QUEST_STATUSES)[number];

export const QUEST_OBJECTIVE_STATUSES = [
  "locked",
  "unlocked",
  "in_progress",
  "completed",
  "skipped",
] as const;
export type QuestObjectiveStatus = (typeof QUEST_OBJECTIVE_STATUSES)[number];

export interface QuestObjectiveState {
  index: number;
  title: string;
  status: QuestObjectiveStatus;
  evidenceRef: string | null;
  completedAt: Date | null;
}

export interface QuestState {
  id: string;
  householdId: string;
  worldId: string;
  storySessionId: string | null;
  title: string;
  summary: string;
  objectives: QuestObjectiveState[];
  status: QuestStatus;
  version: number;
  evidenceRef: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestTemplateObjectiveState {
  index: number;
  objectiveKey: string;
  title: string;
}

export interface QuestTemplateState {
  id: string;
  templateKey: string;
  displayName: string;
  description: string;
  objectives: QuestTemplateObjectiveState[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
