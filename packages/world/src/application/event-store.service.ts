import { DrizzleWorldRepository } from "../db/repositories/drizzle/drizzle-world.repository";
import type { WorldEventType } from "../domain/world-types";
import { getWorldDb } from "./db";
import type { Database } from "../db/client";

let testDb: Database | undefined;

export function __setTestEventDb(db: Database | undefined): void {
  testDb = db;
}

function getDb(): Database {
  return testDb ?? getWorldDb();
}

export interface RecordEventInput {
  worldId: string;
  eventType: WorldEventType;
  aggregateVersion: number;
  actorHouseholdId?: string;
  actorUserId?: string;
  payload: Record<string, unknown>;
}

export async function recordDomainEvent(input: RecordEventInput) {
  const db = getDb();
  const repo = new DrizzleWorldRepository();

  return repo.recordEvent(db, makeEventRecord(input));
}

export async function recordDomainEventWithTx(
  tx: { insert: Database["insert"] },
  input: RecordEventInput,
) {
  const repo = new DrizzleWorldRepository();
  return repo.recordEvent(tx, makeEventRecord(input));
}

function makeEventRecord(input: RecordEventInput) {
  return {
    id: crypto.randomUUID(),
    worldId: input.worldId,
    eventType: input.eventType,
    eventVersion: 1,
    aggregateVersion: input.aggregateVersion,
    actorHouseholdId: input.actorHouseholdId ?? null,
    actorUserId: input.actorUserId ?? null,
    payload: input.payload,
    createdAt: new Date(),
  };
}

export async function getWorldEvents(worldId: string) {
  const db = getDb();
  const repo = new DrizzleWorldRepository();
  return repo.findEventsByWorldId(db, worldId);
}

export async function getEventCountByType(
  worldId: string,
  eventType: WorldEventType,
): Promise<number> {
  const db = getDb();
  const repo = new DrizzleWorldRepository();
  const events = await repo.findEventsByWorldId(db, worldId);
  return events.filter((e) => e.eventType === eventType).length;
}
