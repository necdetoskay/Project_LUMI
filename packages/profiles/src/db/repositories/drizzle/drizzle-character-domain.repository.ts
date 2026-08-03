import { and, eq } from "drizzle-orm";

import type { QueryExecutor } from "../../client";
import {
  characterTraitState,
  characterTraitHistory,
  characterEmotionState,
  characterNeeds,
  characterGoals,
  characterInfluence,
  characterRelationships,
  characterDomainEvents,
  type CharacterTraitStateRecord,
  type NewCharacterTraitStateRecord,
  type CharacterTraitHistoryRecord,
  type NewCharacterTraitHistoryRecord,
  type CharacterEmotionStateRecord,
  type NewCharacterEmotionStateRecord,
  type CharacterNeedRecord,
  type NewCharacterNeedRecord,
  type CharacterGoalRecord,
  type NewCharacterGoalRecord,
  type CharacterInfluenceRecord,
  type NewCharacterInfluenceRecord,
  type CharacterRelationshipRecord,
  type NewCharacterRelationshipRecord,
  type CharacterDomainEventRecord,
  type NewCharacterDomainEventRecord,
} from "../../schema/profile";
import type { CharacterDomainRepository } from "../interfaces/character-domain.repository";

export class DrizzleCharacterDomainRepository implements CharacterDomainRepository {
  constructor(private readonly db: QueryExecutor) {}

  async upsertTraitState(input: NewCharacterTraitStateRecord): Promise<CharacterTraitStateRecord> {
    const [record] = await this.db
      .insert(characterTraitState)
      .values(input)
      .onConflictDoUpdate({
        target: [characterTraitState.characterId, characterTraitState.dimension],
        set: { value: input.value, updatedAt: new Date() },
      })
      .returning();
    if (!record) throw new Error("Trait state upsert returned no record");
    return record as CharacterTraitStateRecord;
  }

  async getTraitStates(characterId: string): Promise<CharacterTraitStateRecord[]> {
    const rows = await this.db
      .select()
      .from(characterTraitState)
      .where(eq(characterTraitState.characterId, characterId));
    return rows as CharacterTraitStateRecord[];
  }

  async deleteTraitStates(characterId: string): Promise<void> {
    await this.db
      .delete(characterTraitState)
      .where(eq(characterTraitState.characterId, characterId));
  }

  async createTraitHistory(input: NewCharacterTraitHistoryRecord): Promise<CharacterTraitHistoryRecord> {
    const [record] = await this.db
      .insert(characterTraitHistory)
      .values(input)
      .returning();
    if (!record) throw new Error("Trait history creation returned no record");
    return record as CharacterTraitHistoryRecord;
  }

  async getTraitHistory(characterId: string): Promise<CharacterTraitHistoryRecord[]> {
    const rows = await this.db
      .select()
      .from(characterTraitHistory)
      .where(eq(characterTraitHistory.characterId, characterId))
      .orderBy(characterTraitHistory.createdAt);
    return rows as CharacterTraitHistoryRecord[];
  }

  async upsertEmotionState(input: NewCharacterEmotionStateRecord): Promise<CharacterEmotionStateRecord> {
    const [record] = await this.db
      .insert(characterEmotionState)
      .values(input)
      .onConflictDoUpdate({
        target: [characterEmotionState.characterId, characterEmotionState.dimension],
        set: { value: input.value, updatedAt: new Date() },
      })
      .returning();
    if (!record) throw new Error("Emotion state upsert returned no record");
    return record as CharacterEmotionStateRecord;
  }

  async getEmotionStates(characterId: string): Promise<CharacterEmotionStateRecord[]> {
    const rows = await this.db
      .select()
      .from(characterEmotionState)
      .where(eq(characterEmotionState.characterId, characterId));
    return rows as CharacterEmotionStateRecord[];
  }

  async deleteEmotionStates(characterId: string): Promise<void> {
    await this.db
      .delete(characterEmotionState)
      .where(eq(characterEmotionState.characterId, characterId));
  }

  async upsertNeed(input: NewCharacterNeedRecord): Promise<CharacterNeedRecord> {
    const [record] = await this.db
      .insert(characterNeeds)
      .values(input)
      .onConflictDoUpdate({
        target: [characterNeeds.characterId, characterNeeds.needType],
        set: { value: input.value, decay: input.decay, updatedAt: new Date() },
      })
      .returning();
    if (!record) throw new Error("Need upsert returned no record");
    return record as CharacterNeedRecord;
  }

  async getNeeds(characterId: string): Promise<CharacterNeedRecord[]> {
    const rows = await this.db
      .select()
      .from(characterNeeds)
      .where(eq(characterNeeds.characterId, characterId));
    return rows as CharacterNeedRecord[];
  }

  async deleteNeeds(characterId: string): Promise<void> {
    await this.db
      .delete(characterNeeds)
      .where(eq(characterNeeds.characterId, characterId));
  }

  async createGoal(input: NewCharacterGoalRecord): Promise<CharacterGoalRecord> {
    const [record] = await this.db
      .insert(characterGoals)
      .values(input)
      .returning();
    if (!record) throw new Error("Goal creation returned no record");
    return record as CharacterGoalRecord;
  }

  async updateGoal(id: string, characterId: string, input: Partial<NewCharacterGoalRecord>): Promise<CharacterGoalRecord> {
    const [record] = await this.db
      .update(characterGoals)
      .set(input)
      .where(and(eq(characterGoals.id, id), eq(characterGoals.characterId, characterId)))
      .returning();
    if (!record) throw new Error("Goal update returned no record");
    return record as CharacterGoalRecord;
  }

  async getGoals(characterId: string): Promise<CharacterGoalRecord[]> {
    const rows = await this.db
      .select()
      .from(characterGoals)
      .where(eq(characterGoals.characterId, characterId))
      .orderBy(characterGoals.createdAt);
    return rows as CharacterGoalRecord[];
  }

  async upsertInfluence(characterId: string, input: Partial<NewCharacterInfluenceRecord>): Promise<CharacterInfluenceRecord> {
    const existing = await this.getInfluence(characterId);
    if (!existing) {
      const [record] = await this.db
        .insert(characterInfluence)
        .values({ characterId, ...input } as NewCharacterInfluenceRecord)
        .returning();
      if (!record) throw new Error("Influence creation returned no record");
      return record as CharacterInfluenceRecord;
    }
    const [record] = await this.db
      .update(characterInfluence)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(characterInfluence.characterId, characterId))
      .returning();
    if (!record) throw new Error("Influence update returned no record");
    return record as CharacterInfluenceRecord;
  }

  async getInfluence(characterId: string): Promise<CharacterInfluenceRecord | null> {
    const [record] = await this.db
      .select()
      .from(characterInfluence)
      .where(eq(characterInfluence.characterId, characterId))
      .limit(1);
    return (record as CharacterInfluenceRecord) ?? null;
  }

  async createRelationship(input: NewCharacterRelationshipRecord): Promise<CharacterRelationshipRecord> {
    const [record] = await this.db
      .insert(characterRelationships)
      .values(input)
      .returning();
    if (!record) throw new Error("Relationship creation returned no record");
    return record as CharacterRelationshipRecord;
  }

  async updateRelationship(
    characterId: string,
    targetCharacterId: string,
    input: Partial<NewCharacterRelationshipRecord>,
  ): Promise<CharacterRelationshipRecord> {
    const [record] = await this.db
      .update(characterRelationships)
      .set({ ...input, updatedAt: new Date() })
      .where(
        and(
          eq(characterRelationships.characterId, characterId),
          eq(characterRelationships.targetCharacterId, targetCharacterId),
        ),
      )
      .returning();
    if (!record) throw new Error("Relationship update returned no record");
    return record as CharacterRelationshipRecord;
  }

  async getRelationships(characterId: string): Promise<CharacterRelationshipRecord[]> {
    const rows = await this.db
      .select()
      .from(characterRelationships)
      .where(eq(characterRelationships.characterId, characterId));
    return rows as CharacterRelationshipRecord[];
  }

  async createDomainEvent(input: NewCharacterDomainEventRecord): Promise<CharacterDomainEventRecord> {
    const [record] = await this.db
      .insert(characterDomainEvents)
      .values(input)
      .returning();
    if (!record) throw new Error("Domain event creation returned no record");
    return record as CharacterDomainEventRecord;
  }

  async getDomainEvents(characterId: string): Promise<CharacterDomainEventRecord[]> {
    const rows = await this.db
      .select()
      .from(characterDomainEvents)
      .where(eq(characterDomainEvents.characterId, characterId))
      .orderBy(characterDomainEvents.createdAt);
    return rows as CharacterDomainEventRecord[];
  }
}
