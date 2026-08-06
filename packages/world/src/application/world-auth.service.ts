import { DrizzleWorldRepository } from "../db/repositories/drizzle/drizzle-world.repository";
import { AuthorizationError, NotFoundError } from "../domain/errors";
import { getWorldDb } from "./db";
import type { Database } from "../db/client";

let testDb: Database | undefined;

export function __setTestAuthDb(db: Database | undefined): void {
  testDb = db;
}

function getDb(): Database {
  return testDb ?? getWorldDb();
}

export async function assertWorldAccess(
  worldId: string,
  householdId: string,
): Promise<void> {
  const db = getDb();
  const repo = new DrizzleWorldRepository();

  const world = await repo.findWorldById(db, worldId);
  if (!world) {
    throw new NotFoundError("World", worldId);
  }
  if (world.householdId !== householdId) {
    throw new AuthorizationError("User does not have access to this world");
  }
}

export async function getWorldOrForbidden(
  worldId: string,
  householdId: string,
) {
  const db = getDb();
  const repo = new DrizzleWorldRepository();

  const world = await repo.findWorldById(db, worldId);
  if (!world) {
    throw new NotFoundError("World", worldId);
  }
  if (world.householdId !== householdId) {
    throw new AuthorizationError("User does not have access to this world");
  }
  return world;
}

export async function assertCharacterWorldAccess(
  characterId: string,
  householdId: string,
) {
  const db = getDb();
  const repo = new DrizzleWorldRepository();

  const world = await repo.findWorldByCharacterId(db, characterId);
  if (!world) {
    throw new NotFoundError("World for character", characterId);
  }
  if (world.householdId !== householdId) {
    throw new AuthorizationError("Character does not belong to this household");
  }
  return world;
}
