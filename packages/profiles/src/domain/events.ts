import type { CharacterState } from "./character";

export type CharacterEventType =
  | "CHARACTER_CREATED"
  | "CHARACTER_UPDATED"
  | "CHARACTER_ARCHIVED"
  | "CHARACTER_RENAMED"
  | "CHARACTER_TRAIT_CHANGED"
  | "CHARACTER_EMOTION_UPDATED"
  | "CHARACTER_GOAL_ADDED"
  | "CHARACTER_GOAL_COMPLETED"
  | "CHARACTER_GOAL_FAILED"
  | "CHARACTER_GOAL_ABANDONED"
  | "CHARACTER_LOCATION_CHANGED"
  | "CHARACTER_RELATIONSHIP_ADDED"
  | "CHARACTER_RELATIONSHIP_UPDATED"
  | "CHARACTER_LIFECYCLE_CHANGED"
  | "CHARACTER_NEEDS_UPDATED"
  | "CHARACTER_INFLUENCE_UPDATED";

export interface CharacterDomainEventRecord {
  id: string;
  characterId: string;
  eventType: CharacterEventType;
  eventVersion: number;
  aggregateVersion: number;
  actorHouseholdId: string;
  actorUserId: string | null;
  payload: Record<string, unknown>;
  createdAt: Date;
}

export function createCharacterEvent(
  eventType: CharacterEventType,
  character: CharacterState,
  actorHouseholdId: string,
  actorUserId: string | null,
  additionalPayload: Record<string, unknown> = {},
): CharacterDomainEventRecord {
  const safePayload: Record<string, unknown> = {
    characterId: character.id,
    childProfileId: character.childProfileId,
    householdId: character.householdId,
    characterSubtype: (character as unknown as Record<string, unknown>).characterSubtype,
    ...additionalPayload,
  };

  return {
    id: crypto.randomUUID(),
    characterId: character.id,
    eventType,
    eventVersion: 1,
    aggregateVersion: (character as unknown as Record<string, unknown>).version as number ?? 1,
    actorHouseholdId,
    actorUserId,
    payload: safePayload,
    createdAt: new Date(),
  };
}
