import { DrizzleCharacterRepository } from "../db/repositories/drizzle/drizzle-character.repository";
import { DrizzleHouseholdRepository } from "../db/repositories/drizzle/drizzle-household.repository";
import type { LumiCharacterRecord } from "../db";
import { AuthorizationError } from "../domain";
import type { BroadCharacterKind, CharacterType, OriginMode } from "../domain/types";
import type { CharacterSummary } from "./character-bootstrap.service";
import { getProfileDb } from "./db";

function toCharacterSummary(record: LumiCharacterRecord): CharacterSummary {
  return {
    id: record.id,
    householdId: record.householdId,
    childProfileId: record.childProfileId,
    name: record.name,
    broadKind: record.broadKind as BroadCharacterKind,
    characterType: record.characterType as CharacterType,
    subtype: record.subtype,
    originMode: record.originMode as OriginMode,
    originConcept: record.originConcept,
    startingLocation: record.startingLocation,
    homeArchetype: record.homeArchetype,
    createdAt: record.createdAt,
  };
}

async function assertHouseholdAccess(
  userId: string,
  householdId: string,
): Promise<void> {
  const db = getProfileDb();
  const household = await new DrizzleHouseholdRepository(db).findByIdForUser(
    householdId,
    userId,
  );
  if (!household) {
    throw new AuthorizationError("User is not a member of this household");
  }
}

export async function listPrimaryChildAvatarsByHousehold(
  userId: string,
  householdId: string,
): Promise<CharacterSummary[]> {
  await assertHouseholdAccess(userId, householdId);
  const repository = new DrizzleCharacterRepository(getProfileDb());
  const records = await repository.listChildAvatarsByHousehold(householdId);
  return records.map(toCharacterSummary);
}

export async function getPrimaryChildAvatarById(
  userId: string,
  householdId: string,
  characterId: string,
): Promise<CharacterSummary | null> {
  await assertHouseholdAccess(userId, householdId);
  const repository = new DrizzleCharacterRepository(getProfileDb());
  const record = await repository.findChildAvatarById(characterId, householdId);
  return record ? toCharacterSummary(record) : null;
}

export async function archivePrimaryChildAvatar(
  userId: string,
  householdId: string,
  characterId: string,
): Promise<{ archived: boolean }> {
  await assertHouseholdAccess(userId, householdId);
  const repository = new DrizzleCharacterRepository(getProfileDb());
  const record = await repository.findChildAvatarById(characterId, householdId);
  if (!record) return { archived: false };
  await repository.softDelete(characterId, householdId);
  return { archived: true };
}
