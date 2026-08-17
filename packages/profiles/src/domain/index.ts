export { Household } from "./household";
export type { HouseholdState, HouseholdMemberState } from "./household";
export { ChildProfile } from "./child-profile";
export type {
  ChildProfileState,
  ChildPreferencesState,
  CharacterOriginHandoff,
} from "./child-profile";
export { ParentPolicy } from "./parent-policy";
export type {
  ParentPolicyState,
  ContentBoundary,
  ParentPolicyMetadata,
  PolicyAuditEntry,
} from "./parent-policy";
export {
  LumiCharacter,
  validateSafetyBounds,
  matchesOriginPackageContract,
} from "./character";
export type { CharacterState } from "./character";
export * from "./character-genesis";
export {
  DomainError,
  ValidationError,
  NotFoundError,
  AuthorizationError,
} from "./errors";
export {
  validateAgeBand,
  validateDisplayName,
  validateMembershipRole,
  validateHouseholdName,
  validateSlug,
  validateStoryLength,
  validateInteractionLevel,
  validateCharacterOriginHandoff,
  validateCharacterName,
  validateOriginDisplaySubtype,
  validateBroadCharacterKind,
  validateOriginMode,
  validateUniverseSeed,
  validateOriginConcept,
  validateContentBoundary,
} from "./validation";
export * from "./types";
export {
  validateTraitVector,
  validateEmotionVector,
  validateNeeds,
  validateGoals,
  validateInfluenceVector,
  validateRelationships,
  validateTraitDelta,
  resolveTraitDeltaAgainstState,
  getDefaultTraitValue,
  validateCharacterSubtype,
  validateCharacterLifecycleStage,
  createDefaultInfluenceVector,
  DEFAULT_CHILD_AVATAR_TRAITS,
  DEFAULT_CHILD_AVATAR_EMOTIONS,
  DEFAULT_NPC_TRAITS,
  DEFAULT_NPC_EMOTIONS,
  MAX_TRAIT_DELTA,
  TRAIT_OLD_VALUE_TOLERANCE,
  TRAIT_BOUND_TOLERANCE,
} from "./character-domain";
export type {
  TraitVector,
  EmotionVector,
  NeedState,
  GoalState,
  InfluenceVector,
  DirectionalRelationship,
  TraitDeltaEntry,
  ResolvedTraitDelta,
  CharacterDomainEvent,
} from "./character-domain";
export { createCharacterEvent } from "./events";
export type { CharacterEventType } from "./events";

export * from "./inventory-types";
export {
  validateOwnerType,
  validateItemCategory,
  validateItemType,
  validateRarity,
  validateStackMode,
  validateDurabilityMode,
  validateTransferType,
  validateEntryStatus,
  validateInventoryType,
  validateDefinitionKey,
  validateItemDefinitionInput,
  validateItemInstanceCreateInput,
  validateOriginType,
  inventoryDomainService,
  InventoryDomainService,
  combineItemInstance,
  DEFAULT_CAPACITY,
  type ItemDefinitionState,
  type ItemInstanceState,
  type OwnershipState,
  type InventoryState,
  type ItemInstanceCreateInput,
  type ResolvedItemInstance,
} from "./inventory";
export { validateItemMetadata } from "./inventory-types";
export type { ItemDefinitionInput } from "./inventory-types";
export { createInventoryEvent } from "./inventory-events";
export type {
  InventoryEventType,
  InventoryDomainEvent,
} from "./inventory-events";
