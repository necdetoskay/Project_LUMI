export type InventoryEventType =
  | "ITEM_ACQUIRED"
  | "ITEM_TRANSFERRED"
  | "ITEM_CONSUMED"
  | "ITEM_ARCHIVED"
  | "ITEM_USED"
  | "ITEM_OWNERSHIP_CHANGED";

export interface InventoryDomainEvent {
  id: string;
  itemInstanceId: string;
  eventType: InventoryEventType;
  actorHouseholdId: string;
  actorUserId: string | null;
  payload: Record<string, unknown>;
  createdAt: Date;
}

export function createInventoryEvent(
  eventType: InventoryEventType,
  itemInstanceId: string,
  actorHouseholdId: string,
  actorUserId: string | null,
  additionalPayload: Record<string, unknown> = {},
): InventoryDomainEvent {
  const safePayload: Record<string, unknown> = {
    itemInstanceId,
    ...additionalPayload,
  };
  return {
    id: crypto.randomUUID(),
    itemInstanceId,
    eventType,
    actorHouseholdId,
    actorUserId,
    payload: safePayload,
    createdAt: new Date(),
  };
}
