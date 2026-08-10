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

export { NpcActionMoveApplicator } from "./npc-action-move-applicator.service";
export type {
  NpcActionMovePayload,
  NpcActionMoveApplicatorResult,
} from "./npc-action-move-applicator.service";

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
  getQuestsBySessionId,
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

export {
  createQuestTemplate,
  getQuestTemplateByKey,
  listQuestTemplates,
  instantiateQuestFromTemplate,
  __setTestQuestTemplateDb,
  __setTestQuestTemplateRepo,
} from "./quest-template.service";
export type { InstantiateQuestInput } from "./quest-template.service";

export {
  instantiateQuestFromSeed,
  assertAutomationInput,
  QUEST_SEED_OPERATION_TYPE,
  __setTestQuestSeedAutomationDb,
  __setTestQuestSeedAutomationRepo,
} from "./quest-seed-automation.service";
export type {
  QuestSeedAutomationInput,
  QuestSeedAutomationResult,
} from "./quest-seed-automation.service";

export { QuestSeedAutomationApplicator } from "./quest-seed-automation-applicator.service";
export type { QuestSeedAutomationApplicatorResult } from "./quest-seed-automation-applicator.service";

export { QuestRewardApplicator } from "./quest-reward-applicator.service";
export type { QuestRewardApplicatorResult } from "./quest-reward-applicator.service";
export type {
  InventoryGrantPort,
  InventoryGrantInput,
  InventoryGrantResult,
} from "./inventory-grant.port";
