import { and, desc, eq } from "drizzle-orm";
import { getProfileDb } from "./db";
import { DrizzleHouseholdRepository } from "../db/repositories/drizzle/drizzle-household.repository";
import { characterCreationCycles, characterCreationSelections, childProfiles, type CharacterCreationDirection } from "../db/schema/profile";
import { AuthorizationError } from "../domain/errors";

async function assertScope(userId: string, householdId: string, childProfileId: string) {
  const db = getProfileDb();
  const household = await new DrizzleHouseholdRepository(db).findByIdForUser(householdId, userId);
  if (!household) throw new AuthorizationError("User is not a member of this household");
  const [profile] = await db.select({ id: childProfiles.id }).from(childProfiles).where(and(eq(childProfiles.id, childProfileId), eq(childProfiles.householdId, householdId))).limit(1);
  if (!profile) throw new AuthorizationError("Child profile does not belong to this household");
}

export async function getActiveCharacterCreationCycle(userId: string, householdId: string, childProfileId: string) {
  await assertScope(userId, householdId, childProfileId);
  const db = getProfileDb();
  const [cycle] = await db.select().from(characterCreationCycles).where(and(eq(characterCreationCycles.householdId, householdId), eq(characterCreationCycles.childProfileId, childProfileId), eq(characterCreationCycles.status, "draft"))).orderBy(desc(characterCreationCycles.updatedAt)).limit(1);
  return cycle ?? null;
}

export async function chooseCharacterCreationDirection(userId: string, input: { householdId: string; childProfileId: string; direction: CharacterCreationDirection }) {
  await assertScope(userId, input.householdId, input.childProfileId);
  const db = getProfileDb();
  const existing = await getActiveCharacterCreationCycle(userId, input.householdId, input.childProfileId);
  const nextStep = input.direction === "character_first" ? "character_type" : "world_feeling";
  const cycleId = existing?.id ?? crypto.randomUUID();

  if (existing) {
    await db.update(characterCreationCycles).set({ startDirection: input.direction, currentStep: nextStep, latestSummary: { startDirection: input.direction }, updatedAt: new Date() }).where(eq(characterCreationCycles.id, existing.id));
  } else {
    await db.insert(characterCreationCycles).values({ id: cycleId, childProfileId: input.childProfileId, householdId: input.householdId, startDirection: input.direction, currentStep: nextStep, latestSummary: { startDirection: input.direction } });
  }

  await db.insert(characterCreationSelections).values({ id: crypto.randomUUID(), cycleId, childProfileId: input.childProfileId, householdId: input.householdId, stepKey: "start", selectionKey: input.direction, selectionPayload: { direction: input.direction }, selectedBy: "user" });
  return { id: cycleId, startDirection: input.direction, currentStep: nextStep };
}
