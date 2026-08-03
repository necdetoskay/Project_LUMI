export {
  createStoryDefinition,
  createStoryVersion,
  saveSceneGraph,
  publishStoryVersion,
  getStoryCatalog,
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
