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
  evaluateRule,
  evaluateOptionAvailability,
} from "./choice/rule-evaluator";
export { hashObject } from "./hash";
