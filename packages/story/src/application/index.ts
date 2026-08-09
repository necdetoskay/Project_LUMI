export {
  createStoryDefinition,
  createStoryVersion,
  saveSceneGraph,
  publishStoryVersion,
  getStoryCatalog,
  ensureStarterStoriesForHousehold,
  getStoryVersionGraph,
  getStoryVersionGraphByNumber,
  getStoryDefinitionById,
  getStoryVersionById,
  __setTestDefinitionDb,
} from "./story-definition.service";
export type {
  CreateStoryDefinitionServiceInput,
  CreateStoryVersionServiceInput,
  SceneGraphInput,
  TransitionGraphInput,
  SaveSceneGraphInput,
} from "./story-definition.service";

export {
  startSession,
  pauseSession,
  resumeSession,
  advanceSession,
  completeSession,
  abandonSession,
  getSessionPlaybackState,
  getSessionHistory,
  getLatestCheckpoint,
  createManualCheckpoint,
  getSessionById,
  getActiveSessionForChildAndWorld,
  listSessionsForChildProfile,
  __setTestSessionDb,
} from "./story-session.service";
export type {
  StartSessionInput,
  SessionStateChangeInput,
  AdvanceSessionInput,
  AbandonSessionInput,
} from "./story-session.service";

export {
  assertStorySessionAccess,
  getStorySessionOrForbidden,
  __setTestAuthDb,
} from "./story-auth.service";

export {
  recordStoryEvent,
  recordStoryEventWithTx,
  getStoryEvents,
  getStoryEventCountByType,
  __setTestEventDb,
} from "./story-event-store.service";
export type { RecordStoryEventInput } from "./story-event-store.service";

export {
  createChoicePoint,
  getChoicePointWithOptions,
  listChoicePointsByScene,
  listChoicePointsByVersion,
  evaluateChoicePointAvailability,
  commitChoice,
  getChoiceHistory,
  createOutcomeCandidate,
  getLatestOutcomeCandidate,
  listConsequencesBySession,
  __setTestChoiceDb,
} from "./choice/choice.service";
export type {
  CreateChoicePointServiceInput,
  CreateChoiceOptionServiceInput,
  CommitChoiceInput,
} from "./choice/choice.service";

export {
  CHOICE_WORLD_HANDOFF_RULE_VERSION,
  commitPersistedChoiceConsequence,
  getLatestChoiceWorldContinuityFacts,
} from "./choice/choice-world-consequence.service";
export type {
  CommitPersistedChoiceConsequenceInput,
  CommitPersistedChoiceConsequenceResult,
} from "./choice/choice-world-consequence.service";

export {
  evaluateRule,
  evaluateOptionAvailability,
} from "./choice/rule-evaluator";
export { hashObject } from "./hash";

export {
  WorldCommitService,
  __setTestCommitDb,
  commitOutcomeWithTx,
} from "./world-commit.service";
export type {
  CommitManifestInput,
  CommitResult,
  CompensateCommitInput,
  CommitOutcomeWithTxInput,
} from "./world-commit.service";

export {
  IndirectEffectPropagator,
  __setTestPropagationDb,
} from "./indirect-effect-propagator.service";
export type {
  PropagateInput,
  PropagateResult,
  IndirectEffectApplicator,
} from "./indirect-effect-propagator.service";
export { listRetryableOutboxHouseholdIds } from "./outbox-work-discovery.service";
export { RumorSpreadApplicator } from "./rumor-propagation-applicator.service";
export { StoryHookDeliveryApplicator } from "./story-hook-delivery-applicator.service";

export { StoryHookService } from "./story-hook.service";
export type { StoryHookResult } from "./story-hook.service";
export {
  getStoryHookForConsumption,
  markStoryHookConsumed,
} from "./story-hook-consumption.service";
export type { StoryHookConsumptionScope } from "./story-hook-consumption.service";

export {
  enqueueQuestRewardIntent,
  __setTestQuestRewardOutboxDb,
} from "./quest-reward-outbox.service";
export type { EnqueueQuestRewardInput } from "./quest-reward-outbox.service";

export { buildHookSceneBrief } from "../domain/hook-scene-brief";
export type { HookSceneBrief } from "../domain/hook-scene-brief";

export {
  normalizeStoryContinuityContext,
  STORY_CONTINUITY_FACT_MAX,
  STORY_CONTINUITY_MAX_FACTS,
} from "./story-continuity-context";
export type {
  StoryContinuityFact,
  StoryContinuityContext,
  ResolveStoryContinuityContextInput,
  StoryContinuityContextPort,
} from "./story-continuity-context";

export { buildStoryScenePrompt } from "./story-scene-prompt";
export type { StoryScenePromptInput } from "./story-scene-prompt";

export {
  parseAndValidateSceneOutput,
  SCENE_NARRATIVE_MAX,
} from "./story-scene-output";
export type {
  GeneratedScene,
  SceneOutputParseResult,
} from "./story-scene-output";

export { LlmConfigError, LlmGenerationError } from "./story-scene-llm-settings";
export type {
  StorySceneLlmSettings,
  StorySceneLlmSettingsPort,
} from "./story-scene-llm-settings";

export { StorySceneGenerationService } from "./story-scene-generation.service";
export type {
  StorySceneGenerationInput,
  StorySceneGenerationResult,
  OpenRouterCaller,
  OpenRouterCallInput,
  OpenRouterCallResult,
  OpenRouterMessage,
} from "./story-scene-generation.service";

export {
  persistGeneratedSceneAndAdvance,
  findGeneratedSceneForHook,
  generatedSceneKeyForSource,
  __setTestGeneratedSceneDb,
} from "./generated-scene-session.service";
export type {
  PersistGeneratedSceneAndAdvanceInput,
  PersistGeneratedSceneAndAdvanceResult,
} from "./generated-scene-session.service";
