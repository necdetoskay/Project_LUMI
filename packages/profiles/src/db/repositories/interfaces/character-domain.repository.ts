import type {
  CharacterTraitStateRecord,
  NewCharacterTraitStateRecord,
  CharacterTraitHistoryRecord,
  NewCharacterTraitHistoryRecord,
  CharacterEmotionStateRecord,
  NewCharacterEmotionStateRecord,
  CharacterNeedRecord,
  NewCharacterNeedRecord,
  CharacterGoalRecord,
  NewCharacterGoalRecord,
  CharacterInfluenceRecord,
  NewCharacterInfluenceRecord,
  CharacterRelationshipRecord,
  NewCharacterRelationshipRecord,
  CharacterDomainEventRecord,
  NewCharacterDomainEventRecord,
} from "../../../db";

export interface CharacterDomainRepository {
  upsertTraitState(
    input: NewCharacterTraitStateRecord,
  ): Promise<CharacterTraitStateRecord>;
  getTraitStates(characterId: string): Promise<CharacterTraitStateRecord[]>;
  deleteTraitStates(characterId: string): Promise<void>;

  createTraitHistory(
    input: NewCharacterTraitHistoryRecord,
  ): Promise<CharacterTraitHistoryRecord>;
  getTraitHistory(characterId: string): Promise<CharacterTraitHistoryRecord[]>;

  upsertEmotionState(
    input: NewCharacterEmotionStateRecord,
  ): Promise<CharacterEmotionStateRecord>;
  getEmotionStates(characterId: string): Promise<CharacterEmotionStateRecord[]>;
  deleteEmotionStates(characterId: string): Promise<void>;

  upsertNeed(input: NewCharacterNeedRecord): Promise<CharacterNeedRecord>;
  getNeeds(characterId: string): Promise<CharacterNeedRecord[]>;
  deleteNeeds(characterId: string): Promise<void>;

  createGoal(input: NewCharacterGoalRecord): Promise<CharacterGoalRecord>;
  updateGoal(
    id: string,
    characterId: string,
    input: Partial<NewCharacterGoalRecord>,
  ): Promise<CharacterGoalRecord>;
  getGoals(characterId: string): Promise<CharacterGoalRecord[]>;

  upsertInfluence(
    characterId: string,
    input: Partial<NewCharacterInfluenceRecord>,
  ): Promise<CharacterInfluenceRecord>;
  getInfluence(characterId: string): Promise<CharacterInfluenceRecord | null>;

  createRelationship(
    input: NewCharacterRelationshipRecord,
  ): Promise<CharacterRelationshipRecord>;
  updateRelationship(
    characterId: string,
    targetCharacterId: string,
    input: Partial<NewCharacterRelationshipRecord>,
  ): Promise<CharacterRelationshipRecord>;
  getRelationships(characterId: string): Promise<CharacterRelationshipRecord[]>;

  createDomainEvent(
    input: NewCharacterDomainEventRecord,
  ): Promise<CharacterDomainEventRecord>;
  getDomainEvents(characterId: string): Promise<CharacterDomainEventRecord[]>;
}
