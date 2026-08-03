import type { WorldEventType } from "./world-types";

export interface WorldDomainEvent {
  id: string;
  worldId: string;
  eventType: WorldEventType;
  eventVersion: number;
  aggregateVersion: number;
  actorHouseholdId: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

export function createWorldEvent(
  worldId: string,
  eventType: WorldEventType,
  aggregateVersion: number,
  actorHouseholdId: string,
  additionalPayload: Record<string, unknown> = {},
): WorldDomainEvent {
  return {
    id: crypto.randomUUID(),
    worldId,
    eventType,
    eventVersion: 1,
    aggregateVersion,
    actorHouseholdId,
    payload: {
      ...additionalPayload,
      eventType,
    },
    createdAt: new Date(),
  };
}
