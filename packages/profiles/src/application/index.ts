export {
  createHousehold,
  getOwnedHousehold,
  getHouseholdForUser,
  assertHouseholdOwnership,
} from "./household.service";
export type {
  CreateHouseholdInput,
  HouseholdResult,
} from "./household.service";

export {
  createChildProfile,
  listChildProfiles,
  updateChildProfile,
  archiveChildProfile,
  findChildProfileForUser,
  getChildProfilePreferences,
} from "./child-profile.service";
export type {
  CreateChildProfileInput,
  UpdateChildProfileInput,
  ChildProfileResult,
  ChildPreferenceResult,
} from "./child-profile.service";

export {
  CHILD_INTERESTS,
  DEVELOPMENT_GOALS,
  getChildPersonalization,
  updateChildPersonalization,
} from "./child-profile-personalization.service";
export type {
  ChildInterest,
  DevelopmentGoal,
  ChildPersonalizationResult,
  UpdateChildPersonalizationInput,
} from "./child-profile-personalization.service";

export {
  getPolicy,
  updatePolicy,
  appendPolicyAudit,
  getPolicyAuditTrail,
} from "./parent-policy.service";
export type {
  PolicyResult,
  UpdatePolicyInput,
  PolicyAuditEntryResult,
} from "./parent-policy.service";

export { getOnboardingState } from "./onboarding.service";
export type { OnboardingState } from "./onboarding.service";

export {
  createOrReplaceFirstRunHandoff,
  getCharacterBootstrapStatus,
  generateAndPersistOriginPackages,
  listOriginPackages,
  consumeHandoffAndCreateCharacter,
  listCharactersByHousehold,
  listCharactersByChildProfile,
  getCharacterById,
} from "./character-bootstrap.service";
export type {
  CreateHandoffInput,
  OriginPackageInput,
  CharacterBootstrapStatus,
  CharacterSummary,
  GeneratedOriginPackage,
  GenerateAndPersistResult,
} from "./character-bootstrap.service";

export {
  getCharacterDomain,
  applyTraitDeltas,
  updateEmotions,
  updateNeeds,
  addGoal,
  completeGoal,
  upsertInfluence,
  addRelationship,
  updateLocation,
  getCharacterEvents,
} from "./character-domain.service";
export type { CharacterDomainSummary } from "./character-domain.service";

export {
  CHARACTER_VISUAL_BRIEF_VERSION,
  buildCharacterVisualBrief,
  fingerprintCharacterVisualBrief,
} from "./character-visual-brief";
export type {
  CharacterVisualBrief,
  CharacterVisualBriefSource,
} from "./character-visual-brief";

export { renderCharacterVisualPrompt } from "./character-visual-generation";
export type {
  CharacterVisualGenerationPort,
  CharacterVisualGenerationRequest,
  CharacterVisualGenerationResult,
  CharacterVisualStoragePort,
  CharacterVisualStorageInput,
  GeneratedImageCandidate,
} from "./character-visual-generation";

export {
  generateCharacterVisualCandidates,
  listCharacterVisualCandidates,
  getCharacterVisualCanon,
  selectCharacterVisualCanon,
  rejectCharacterVisualCandidate,
} from "./character-visual.service";
export type {
  GenerateCharacterVisualInput,
  CharacterVisualServiceDeps,
} from "./character-visual.service";

export {
  MANAGED_ASSET_SUBJECT_TYPES,
  listManagedAssets,
  getManagedAssetCanon,
  registerManagedAssetMetadata,
  selectManagedAssetCanon,
  rejectManagedAsset,
  archiveManagedAsset,
  getManagedAssetLifecycleHistory,
} from "./managed-asset.service";
export type {
  ManagedAssetSubjectType,
  ManagedAssetLifecycleState,
  ManagedAssetOriginType,
  ManagedAssetScope,
  ManagedAssetAuthorizationPort,
  ManagedAssetServiceDeps,
  RegisterManagedAssetInput,
} from "./managed-asset.service";

export {
  EMOTION_RULE_VERSION,
  evaluateEmotionEvent,
  applyEmotionEvent,
} from "./emotion-event.service";
export type {
  EmotionEventKind,
  EmotionEventInput,
  ResolvedEmotionDelta,
  EmotionEventApplicationResult,
} from "./emotion-event.service";

export { getCharacterContinuitySnapshot } from "./character-continuity.service";
export type { CharacterContinuitySnapshot } from "./character-continuity.service";

export {
  createItemDefinition,
  acquireItem,
  transferItem,
  consumeItem,
  archiveItem,
  getItem,
  getItemHistory,
  listInventory,
  __setTestDb as __setInventoryTestDb,
} from "./inventory.service";
export type { InventorySummary } from "./inventory.service";

export {
  STORY_REWARD_SYSTEM_AUTHORITY,
  grantStoryRewardAsSystem,
} from "./system-inventory-grant.service";
export type {
  InventorySystemAuthority,
  StoryRewardSystemGrantInput,
  StoryRewardSystemGrantResult,
} from "./system-inventory-grant.service";

export * from "./llm-settings";
