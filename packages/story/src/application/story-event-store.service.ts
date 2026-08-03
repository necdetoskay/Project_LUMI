import { DrizzleStoryRepository } from "../db/repositories/drizzle/drizzle-story.repository";
import type { StoryEventType } from "../domain/story-types";
import { getStoryDb } from "./db";
import type { Database } from "../db/client";

let testDb: Database | undefined;

export function __setTestEventDb(db: Database | undefined): void {
  testDb = db;
}

function getDb(): Database {
  return testDb ?? getStoryDb();
}

export interface RecordStoryEventInput {
  storySessionId: string;
  childProfileId: string;
  eventType: StoryEventType;
  aggregateVersion: number;
  actorHouseholdId?: string;
  actorUserId?: string;
  payload: Record<string, unknown>;
}

export async function recordStoryEvent(input: RecordStoryEventInput) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  return repo.recordEvent(db, makeEventRecord(input));
}

export async function recordStoryEventWithTx(
  tx: { insert: Database["insert"] },
  input: RecordStoryEventInput,
) {
  const repo = new DrizzleStoryRepository();
  return repo.recordEvent(tx, makeEventRecord(input));
}

function makeEventRecord(input: RecordStoryEventInput) {
  return {
    id: crypto.randomUUID(),
    storySessionId: input.storySessionId,
    eventType: input.eventType,
    eventVersion: 1,
    aggregateVersion: input.aggregateVersion,
    actorHouseholdId: input.actorHouseholdId ?? null,
    childProfileId: input.childProfileId,
    payload: input.payload,
    createdAt: new Date(),
  };
}

export async function getStoryEvents(storySessionId: string) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  return repo.findEventsBySession(db, storySessionId);
}

export async function getStoryEventCountByType(storySessionId: string, eventType: StoryEventType): Promise<number> {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const events = await repo.findEventsBySession(db, storySessionId);
  return events.filter((e) => e.eventType === eventType).length;
}
