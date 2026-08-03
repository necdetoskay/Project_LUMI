import type { WorldEventType } from "../domain/world-types";

export interface WorldDomainEventRecord {
  id: string;
  worldId: string;
  eventType: WorldEventType;
  eventVersion: number;
  aggregateVersion: number;
  actorHouseholdId: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

export function createWorldEventRecord(
  worldId: string,
  eventType: WorldEventType,
  aggregateVersion: number,
  actorHouseholdId: string,
  additionalPayload: Record<string, unknown> = {},
): WorldDomainEventRecord {
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
