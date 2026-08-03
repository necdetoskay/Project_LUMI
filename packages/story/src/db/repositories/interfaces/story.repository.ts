import type {
  StoryDefinitionRecord,
  NewStoryDefinitionRecord,
  StoryVersionRecord,
  NewStoryVersionRecord,
  StorySceneRecord,
  NewStorySceneRecord,
  StorySceneTransitionRecord,
  NewStorySceneTransitionRecord,
  StorySessionRecord,
  NewStorySessionRecord,
  StorySessionCharacterRecord,
  NewStorySessionCharacterRecord,
  StorySessionSceneVisitRecord,
  NewStorySessionSceneVisitRecord,
  StorySessionCheckpointRecord,
  NewStorySessionCheckpointRecord,
  StoryEventStoreRecord,
  NewStoryEventStoreRecord,
  StoryIdempotencyLedgerRecord,
  NewStoryIdempotencyLedgerRecord,
} from "../../schema/story";
import type { QueryExecutor } from "../../client";

export interface StoryRepository {
  createDefinition(tx: { insert: QueryExecutor["insert"] }, data: NewStoryDefinitionRecord): Promise<StoryDefinitionRecord>;
  findDefinitionById(tx: { select: QueryExecutor["select"] }, id: string): Promise<StoryDefinitionRecord | undefined>;
  findDefinitionsByHousehold(tx: { select: QueryExecutor["select"] }, householdId: string): Promise<StoryDefinitionRecord[]>;
  updateDefinition(tx: { update: QueryExecutor["update"] }, id: string, data: Partial<NewStoryDefinitionRecord>): Promise<StoryDefinitionRecord | undefined>;

  createVersion(tx: { insert: QueryExecutor["insert"] }, data: NewStoryVersionRecord): Promise<StoryVersionRecord>;
  findVersionById(tx: { select: QueryExecutor["select"] }, id: string): Promise<StoryVersionRecord | undefined>;
  findVersionsByDefinition(tx: { select: QueryExecutor["select"] }, storyDefinitionId: string): Promise<StoryVersionRecord[]>;
  findVersionByDefinitionAndNumber(
    tx: { select: QueryExecutor["select"] },
    storyDefinitionId: string,
    versionNumber: number,
  ): Promise<StoryVersionRecord | undefined>;
  findPublishedVersion(tx: { select: QueryExecutor["select"] }, storyDefinitionId: string): Promise<StoryVersionRecord | undefined>;
  updateVersion(tx: { update: QueryExecutor["update"] }, id: string, data: Partial<NewStoryVersionRecord>): Promise<StoryVersionRecord | undefined>;

  createScene(tx: { insert: QueryExecutor["insert"] }, data: NewStorySceneRecord): Promise<StorySceneRecord>;
  findScenesByVersion(tx: { select: QueryExecutor["select"] }, storyVersionId: string): Promise<StorySceneRecord[]>;
  findSceneById(tx: { select: QueryExecutor["select"] }, id: string): Promise<StorySceneRecord | undefined>;

  createTransition(tx: { insert: QueryExecutor["insert"] }, data: NewStorySceneTransitionRecord): Promise<StorySceneTransitionRecord>;
  findTransitionsByVersion(tx: { select: QueryExecutor["select"] }, storyVersionId: string): Promise<StorySceneTransitionRecord[]>;

  createSession(tx: { insert: QueryExecutor["insert"] }, data: NewStorySessionRecord): Promise<StorySessionRecord>;
  findSessionById(tx: { select: QueryExecutor["select"] }, id: string): Promise<StorySessionRecord | undefined>;
  findActiveSessionByChildAndWorld(
    tx: { select: QueryExecutor["select"] },
    childProfileId: string,
    worldId: string,
  ): Promise<StorySessionRecord | undefined>;
  updateSession(tx: { update: QueryExecutor["update"] }, id: string, data: Partial<NewStorySessionRecord>, expectedVersion?: number): Promise<StorySessionRecord | undefined>;

  createSessionCharacter(tx: { insert: QueryExecutor["insert"] }, data: NewStorySessionCharacterRecord): Promise<StorySessionCharacterRecord>;
  findSessionCharacters(tx: { select: QueryExecutor["select"] }, storySessionId: string): Promise<StorySessionCharacterRecord[]>;

  createSceneVisit(tx: { insert: QueryExecutor["insert"] }, data: NewStorySessionSceneVisitRecord): Promise<StorySessionSceneVisitRecord>;
  findSceneVisitsBySession(tx: { select: QueryExecutor["select"] }, storySessionId: string): Promise<StorySessionSceneVisitRecord[]>;

  createCheckpoint(tx: { insert: QueryExecutor["insert"] }, data: NewStorySessionCheckpointRecord): Promise<StorySessionCheckpointRecord>;
  findCheckpointsBySession(tx: { select: QueryExecutor["select"] }, storySessionId: string): Promise<StorySessionCheckpointRecord[]>;
  findLatestCheckpoint(tx: { select: QueryExecutor["select"] }, storySessionId: string): Promise<StorySessionCheckpointRecord | undefined>;

  recordEvent(tx: { insert: QueryExecutor["insert"] }, data: NewStoryEventStoreRecord): Promise<StoryEventStoreRecord>;
  findEventsBySession(tx: { select: QueryExecutor["select"] }, storySessionId: string): Promise<StoryEventStoreRecord[]>;

  recordIdempotency(tx: { insert: QueryExecutor["insert"] }, data: NewStoryIdempotencyLedgerRecord): Promise<StoryIdempotencyLedgerRecord>;
  findIdempotencyRecord(
    tx: { select: QueryExecutor["select"] },
    householdId: string,
    operationType: string,
    idempotencyKey: string,
  ): Promise<StoryIdempotencyLedgerRecord | undefined>;
}
