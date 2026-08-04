import { DrizzleStoryRepository } from "../db/repositories/drizzle/drizzle-story.repository";
import { AuthorizationError, NotFoundError } from "../domain/errors";
import { getStoryDb } from "./db";
import type { Database } from "../db/client";

let testDb: Database | undefined;

export function __setTestAuthDb(db: Database | undefined): void {
  testDb = db;
}

function getDb(): Database {
  return testDb ?? getStoryDb();
}

export async function assertStorySessionAccess(
  storySessionId: string,
  householdId: string,
): Promise<void> {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const session = await repo.findSessionById(db, storySessionId);
  if (!session) {
    throw new NotFoundError("StorySession", storySessionId);
  }
  if (session.householdId !== householdId) {
    throw new AuthorizationError(
      "User does not have access to this story session",
    );
  }
}

export async function getStorySessionOrForbidden(
  storySessionId: string,
  householdId: string,
) {
  const db = getDb();
  const repo = new DrizzleStoryRepository();
  const session = await repo.findSessionById(db, storySessionId);
  if (!session) {
    throw new NotFoundError("StorySession", storySessionId);
  }
  if (session.householdId !== householdId) {
    throw new AuthorizationError(
      "User does not have access to this story session",
    );
  }
  return session;
}
