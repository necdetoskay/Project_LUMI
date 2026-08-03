import { eq, desc, inArray, and } from "drizzle-orm";


import type { QueryExecutor } from "../../client";
import type { StoryRepository } from "../interfaces/story.repository";
import {
  storyDefinitions,
  storyVersions,
  storyScenes,
  storySceneTransitions,
  storySessions,
  storySessionCharacters,
  storySessionSceneVisits,
  storySessionCheckpoints,
  storyEventStore,
  storyIdempotencyLedger,
} from "../../schema/story";
import type {
  NewStoryDefinitionRecord,
  NewStoryVersionRecord,
  NewStorySceneRecord,
  NewStorySceneTransitionRecord,
  NewStorySessionRecord,
  NewStorySessionCharacterRecord,
  NewStorySessionSceneVisitRecord,
  NewStorySessionCheckpointRecord,
  NewStoryEventStoreRecord,
  NewStoryIdempotencyLedgerRecord,
} from "../../schema/story";

export class DrizzleStoryRepository implements StoryRepository {
  async createDefinition(tx: { insert: QueryExecutor["insert"] }, data: NewStoryDefinitionRecord) {
    const [row] = await tx.insert(storyDefinitions).values(data).returning();
    return row!;
  }

  async findDefinitionById(tx: { select: QueryExecutor["select"] }, id: string) {
    const [row] = await tx.select().from(storyDefinitions).where(eq(storyDefinitions.id, id)).limit(1);
    return row;
  }

  async findDefinitionsByHousehold(tx: { select: QueryExecutor["select"] }, householdId: string) {
    return tx.select().from(storyDefinitions).where(eq(storyDefinitions.householdId, householdId));
  }

  async updateDefinition(tx: { update: QueryExecutor["update"] }, id: string, data: Partial<NewStoryDefinitionRecord>) {
    const [row] = await tx.update(storyDefinitions).set(data).where(eq(storyDefinitions.id, id)).returning();
    return row;
  }

  async createVersion(tx: { insert: QueryExecutor["insert"] }, data: NewStoryVersionRecord) {
    const [row] = await tx.insert(storyVersions).values(data).returning();
    return row!;
  }

  async findVersionById(tx: { select: QueryExecutor["select"] }, id: string) {
    const [row] = await tx.select().from(storyVersions).where(eq(storyVersions.id, id)).limit(1);
    return row;
  }

  async findVersionsByDefinition(tx: { select: QueryExecutor["select"] }, storyDefinitionId: string) {
    return tx.select().from(storyVersions)
      .where(eq(storyVersions.storyDefinitionId, storyDefinitionId))
      .orderBy(storyVersions.versionNumber);
  }

  async findVersionByDefinitionAndNumber(
    tx: { select: QueryExecutor["select"] },
    storyDefinitionId: string,
    versionNumber: number,
  ) {
    const [row] = await tx.select().from(storyVersions)
      .where(and(
        eq(storyVersions.storyDefinitionId, storyDefinitionId),
        eq(storyVersions.versionNumber, versionNumber),
      ))
      .limit(1);
    return row;
  }

  async findPublishedVersion(tx: { select: QueryExecutor["select"] }, storyDefinitionId: string) {
    const [row] = await tx.select().from(storyVersions)
      .where(and(
        eq(storyVersions.storyDefinitionId, storyDefinitionId),
        eq(storyVersions.publicationStatus, "published"),
      ))
      .orderBy(desc(storyVersions.versionNumber))
      .limit(1);
    return row;
  }

  async updateVersion(tx: { update: QueryExecutor["update"] }, id: string, data: Partial<NewStoryVersionRecord>) {
    const [row] = await tx.update(storyVersions).set(data).where(eq(storyVersions.id, id)).returning();
    return row;
  }

  async createScene(tx: { insert: QueryExecutor["insert"] }, data: NewStorySceneRecord) {
    const [row] = await tx.insert(storyScenes).values(data).returning();
    return row!;
  }

  async findScenesByVersion(tx: { select: QueryExecutor["select"] }, storyVersionId: string) {
    return tx.select().from(storyScenes)
      .where(eq(storyScenes.storyVersionId, storyVersionId))
      .orderBy(storyScenes.sequenceNumber);
  }

  async findSceneById(tx: { select: QueryExecutor["select"] }, id: string) {
    const [row] = await tx.select().from(storyScenes).where(eq(storyScenes.id, id)).limit(1);
    return row;
  }

  async createTransition(tx: { insert: QueryExecutor["insert"] }, data: NewStorySceneTransitionRecord) {
    const [row] = await tx.insert(storySceneTransitions).values(data).returning();
    return row!;
  }

  async findTransitionsByVersion(tx: { select: QueryExecutor["select"] }, storyVersionId: string) {
    return tx.select().from(storySceneTransitions)
      .where(eq(storySceneTransitions.storyVersionId, storyVersionId));
  }

  async createSession(tx: { insert: QueryExecutor["insert"] }, data: NewStorySessionRecord) {
    const [row] = await tx.insert(storySessions).values(data).returning();
    return row!;
  }

  async findSessionById(tx: { select: QueryExecutor["select"] }, id: string) {
    const [row] = await tx.select().from(storySessions).where(eq(storySessions.id, id)).limit(1);
    return row;
  }

  async findActiveSessionByChildAndWorld(
    tx: { select: QueryExecutor["select"] },
    childProfileId: string,
    worldId: string,
  ) {
    const [row] = await tx.select().from(storySessions)
      .where(and(
        eq(storySessions.childProfileId, childProfileId),
        eq(storySessions.worldId, worldId),
        inArray(storySessions.sessionStatus, ["active", "paused"]),
      ))
      .limit(1);
    return row;
  }

  async updateSession(
    tx: { update: QueryExecutor["update"] },
    id: string,
    data: Partial<NewStorySessionRecord>,
    expectedVersion?: number,
  ) {
    const where = expectedVersion !== undefined
      ? and(eq(storySessions.id, id), eq(storySessions.version, expectedVersion))
      : eq(storySessions.id, id);
    const [row] = await tx.update(storySessions).set(data).where(where).returning();
    return row;
  }

  async createSessionCharacter(tx: { insert: QueryExecutor["insert"] }, data: NewStorySessionCharacterRecord) {
    const [row] = await tx.insert(storySessionCharacters).values(data).returning();
    return row!;
  }

  async findSessionCharacters(tx: { select: QueryExecutor["select"] }, storySessionId: string) {
    return tx.select().from(storySessionCharacters)
      .where(eq(storySessionCharacters.storySessionId, storySessionId));
  }

  async createSceneVisit(tx: { insert: QueryExecutor["insert"] }, data: NewStorySessionSceneVisitRecord) {
    const [row] = await tx.insert(storySessionSceneVisits).values(data).returning();
    return row!;
  }

  async findSceneVisitsBySession(tx: { select: QueryExecutor["select"] }, storySessionId: string) {
    return tx.select().from(storySessionSceneVisits)
      .where(eq(storySessionSceneVisits.storySessionId, storySessionId))
      .orderBy(storySessionSceneVisits.visitSequence);
  }

  async createCheckpoint(tx: { insert: QueryExecutor["insert"] }, data: NewStorySessionCheckpointRecord) {
    const [row] = await tx.insert(storySessionCheckpoints).values(data).returning();
    return row!;
  }

  async findCheckpointsBySession(tx: { select: QueryExecutor["select"] }, storySessionId: string) {
    return tx.select().from(storySessionCheckpoints)
      .where(eq(storySessionCheckpoints.storySessionId, storySessionId))
      .orderBy(desc(storySessionCheckpoints.sequenceNumber));
  }

  async findLatestCheckpoint(tx: { select: QueryExecutor["select"] }, storySessionId: string) {
    const [row] = await tx.select().from(storySessionCheckpoints)
      .where(eq(storySessionCheckpoints.storySessionId, storySessionId))
      .orderBy(desc(storySessionCheckpoints.sequenceNumber))
      .limit(1);
    return row;
  }

  async recordEvent(tx: { insert: QueryExecutor["insert"] }, data: NewStoryEventStoreRecord) {
    const [row] = await tx.insert(storyEventStore).values(data).returning();
    return row!;
  }

  async findEventsBySession(tx: { select: QueryExecutor["select"] }, storySessionId: string) {
    return tx.select().from(storyEventStore)
      .where(eq(storyEventStore.storySessionId, storySessionId))
      .orderBy(storyEventStore.createdAt);
  }

  async recordIdempotency(tx: { insert: QueryExecutor["insert"] }, data: NewStoryIdempotencyLedgerRecord) {
    const [row] = await tx.insert(storyIdempotencyLedger).values(data).returning();
    return row!;
  }

  async findIdempotencyRecord(
    tx: { select: QueryExecutor["select"] },
    householdId: string,
    operationType: string,
    idempotencyKey: string,
  ) {
    const [row] = await tx.select().from(storyIdempotencyLedger)
      .where(and(
        eq(storyIdempotencyLedger.householdId, householdId),
        eq(storyIdempotencyLedger.operationType, operationType),
        eq(storyIdempotencyLedger.idempotencyKey, idempotencyKey),
      ))
      .limit(1);
    return row;
  }
}
