import { NotFoundError, AuthorizationError, ValidationError } from "../domain/errors";
import type { MoveType } from "../domain/world-types";
import { DrizzleWorldRepository } from "../db/repositories/drizzle/drizzle-world.repository";
import { getWorldDb } from "./db";
import { recordDomainEventWithTx } from "./event-store.service";
import type { Database } from "../db/client";

let testDb: Database | undefined;

export function __setTestMoveDb(db: Database | undefined): void {
  testDb = db;
}

function getDb(): Database {
  return testDb ?? getWorldDb();
}

export interface MoveCharacterInput {
  characterId: string;
  targetLocationId: string;
  householdId: string;
  worldId?: string;
  moveType?: MoveType;
}

export interface MoveCharacterResult {
  previousLocationId: string | null;
  newLocationId: string;
  moveType: MoveType;
  eventId: string;
}

export async function moveCharacterToLocation(input: MoveCharacterInput): Promise<MoveCharacterResult> {
  const db = getDb();
  const repo = new DrizzleWorldRepository();

  const result = await db.transaction(async (tx) => {
    const worldRecord = await repo.findWorldByCharacterId(tx, input.characterId);
    if (!worldRecord) throw new NotFoundError("World for character", input.characterId);

    if (input.worldId && worldRecord.id !== input.worldId) {
      throw new AuthorizationError("World ID mismatch: character does not belong to the specified world");
    }

    if (worldRecord.householdId !== input.householdId) {
      throw new AuthorizationError("Character world does not belong to this household");
    }

    if (worldRecord.lifecycleStatus === "archived") {
      throw new ValidationError("WORLD_ARCHIVED", "Cannot move character: world is archived");
    }

    const targetLocation = await repo.findLocationById(tx, input.targetLocationId);
    if (!targetLocation) throw new NotFoundError("Location", input.targetLocationId);

    if (targetLocation.accessibilityStatus !== "open") {
      throw new ValidationError(
        "LOCATION_NOT_ACCESSIBLE",
        `Location ${targetLocation.displayName} is not accessible (status: ${targetLocation.accessibilityStatus})`,
      );
    }

    if (targetLocation.worldId !== worldRecord.id) {
      throw new AuthorizationError("Target location does not belong to character's world");
    }

    const currentLocation = await repo.findCharacterLocation(tx, input.characterId);
    const previousLocationId = currentLocation?.locationId ?? null;

    if (currentLocation?.locationId === input.targetLocationId) {
      throw new ValidationError("ALREADY_AT_LOCATION", "Character is already at this location");
    }

    if (previousLocationId !== null) {
      const connection = await repo.findConnectionBetweenLocations(tx, previousLocationId, input.targetLocationId);
      if (!connection) {
        throw new ValidationError(
          "NO_CONNECTION",
          `No path exists between current location and target location`,
        );
      }
    }

    const moveType: MoveType = input.moveType ?? (previousLocationId === null ? "arrival" : "movement");

    await repo.upsertCharacterLocation(tx, {
      characterId: input.characterId,
      worldId: worldRecord.id,
      locationId: input.targetLocationId,
      enteredAt: new Date(),
      version: currentLocation ? currentLocation.version + 1 : 1,
    });

    const event = await repo.createMovementEvent(tx, {
      id: crypto.randomUUID(),
      characterId: input.characterId,
      worldId: worldRecord.id,
      fromLocationId: previousLocationId,
      toLocationId: input.targetLocationId,
      moveType,
      createdAt: new Date(),
    });

    const eventType = moveType === "arrival" ? "CHARACTER_ARRIVED" as never : moveType === "return_home" ? "CHARACTER_RETURNED_HOME" as never : "CHARACTER_MOVED" as never;

    await recordDomainEventWithTx(tx, {
      worldId: worldRecord.id,
      eventType,
      aggregateVersion: worldRecord.version + 1,
      actorHouseholdId: input.householdId,
      payload: {
        characterId: input.characterId,
        fromLocationId: previousLocationId,
        toLocationId: input.targetLocationId,
      },
    });

    return {
      previousLocationId,
      newLocationId: input.targetLocationId,
      moveType,
      eventId: event.id,
    };
  });

  return result;
}

export async function getCharacterCurrentLocation(characterId: string) {
  const db = getDb();
  const repo = new DrizzleWorldRepository();
  const loc = await repo.findCharacterLocation(db, characterId);
  if (!loc) return null;

  const locationRecord = await repo.findLocationById(db, loc.locationId);
  return locationRecord ?? null;
}

export async function getCharacterMovementHistory(characterId: string) {
  const db = getDb();
  const repo = new DrizzleWorldRepository();
  return repo.findMovementEventsByCharacterId(db, characterId);
}
