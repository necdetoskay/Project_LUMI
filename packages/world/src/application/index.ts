export {
  createWorldFromOrigin,
  getWorldForCharacter,
  getWorldById,
  archiveWorld,
  __setTestWorldDb,
} from "./world-bootstrap.service";
export type {
  OriginPackageInput,
  BootstrapWorldInput,
  BootstrapWorldResult,
} from "./world-bootstrap.service";

export {
  moveCharacterToLocation,
  getCharacterCurrentLocation,
  getCharacterMovementHistory,
  __setTestMoveDb,
} from "./movement.service";
export type {
  MoveCharacterInput,
  MoveCharacterResult,
} from "./movement.service";

export {
  createCheckpoint,
  getWorldCheckpoints,
  verifyCheckpointHash,
  __setTestCheckpointDb,
} from "./checkpoint.service";

export {
  recordDomainEvent,
  getWorldEvents,
  getEventCountByType,
  __setTestEventDb,
} from "./event-store.service";
export type { RecordEventInput } from "./event-store.service";

export {
  assertWorldAccess,
  getWorldOrForbidden,
  assertCharacterWorldAccess,
  __setTestAuthDb,
} from "./world-auth.service";

export { getWorldDetail, __setTestDetailDb } from "./world-detail.service";

export {
  createQuest,
  activateQuest,
  progressObjective,
  pauseQuest,
  resumeQuest,
  abandonQuest,
  getQuestById,
  getQuestsByWorldId,
  __setTestQuestDb,
  __setTestQuestRepo,
} from "./quest.service";

export {
  applyQuestChange,
  __setTestQuestChangeDb,
  __setTestQuestChangeRepo,
} from "./quest-change-applicator.service";
export type {
  QuestWorldChangeInput,
  ApplyQuestChangeResult,
} from "./quest-change-applicator.service";
