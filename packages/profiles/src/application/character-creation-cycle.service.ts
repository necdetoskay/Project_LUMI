import { and, desc, eq } from "drizzle-orm";
import { getProfileDb } from "./db";
import { DrizzleHouseholdRepository } from "../db/repositories/drizzle/drizzle-household.repository";
import {
  characterCreationCycles,
  characterCreationSelections,
  childProfiles,
  type CharacterCreationDirection,
} from "../db/schema/profile";
import { AuthorizationError } from "../domain/errors";
export type WorldFeelingKey =
  | "oceanic"
  | "sky_islands"
  | "enchanted_forest"
  | "crystal_caverns"
  | "desert_ruins"
  | "living_city";
async function assertScope(
  userId: string,
  householdId: string,
  childProfileId: string,
) {
  const db = getProfileDb();
  const household = await new DrizzleHouseholdRepository(db).findByIdForUser(
    householdId,
    userId,
  );
  if (!household)
    throw new AuthorizationError("User is not a member of this household");
  const [profile] = await db
    .select({ id: childProfiles.id })
    .from(childProfiles)
    .where(
      and(
        eq(childProfiles.id, childProfileId),
        eq(childProfiles.householdId, householdId),
      ),
    )
    .limit(1);
  if (!profile)
    throw new AuthorizationError(
      "Child profile does not belong to this household",
    );
}
export async function getActiveCharacterCreationCycle(
  userId: string,
  householdId: string,
  childProfileId: string,
) {
  await assertScope(userId, householdId, childProfileId);
  const db = getProfileDb();
  const [cycle] = await db
    .select()
    .from(characterCreationCycles)
    .where(
      and(
        eq(characterCreationCycles.householdId, householdId),
        eq(characterCreationCycles.childProfileId, childProfileId),
        eq(characterCreationCycles.status, "draft"),
      ),
    )
    .orderBy(desc(characterCreationCycles.updatedAt))
    .limit(1);
  return cycle ?? null;
}
export async function chooseCharacterCreationDirection(
  userId: string,
  input: {
    householdId: string;
    childProfileId: string;
    direction: CharacterCreationDirection;
  },
) {
  await assertScope(userId, input.householdId, input.childProfileId);
  const db = getProfileDb();
  const existing = await getActiveCharacterCreationCycle(
    userId,
    input.householdId,
    input.childProfileId,
  );
  const nextStep =
    input.direction === "character_first" ? "character_type" : "world_feeling";
  const cycleId = existing?.id ?? crypto.randomUUID();
  if (existing)
    await db
      .update(characterCreationCycles)
      .set({
        startDirection: input.direction,
        currentStep: nextStep,
        latestSummary: {
          ...(existing.latestSummary ?? {}),
          startDirection: input.direction,
        },
        updatedAt: new Date(),
      })
      .where(eq(characterCreationCycles.id, existing.id));
  else
    await db
      .insert(characterCreationCycles)
      .values({
        id: cycleId,
        childProfileId: input.childProfileId,
        householdId: input.householdId,
        startDirection: input.direction,
        currentStep: nextStep,
        latestSummary: { startDirection: input.direction },
      });
  await db.insert(characterCreationSelections).values({
    id: crypto.randomUUID(),
    cycleId,
    childProfileId: input.childProfileId,
    householdId: input.householdId,
    stepKey: "start",
    selectionKey: input.direction,
    selectionPayload: { direction: input.direction },
    selectedBy: "user",
  });
  return { id: cycleId, startDirection: input.direction, currentStep: nextStep };
}
export async function chooseWorldFeeling(
  userId: string,
  input: { householdId: string; childProfileId: string; feeling: WorldFeelingKey },
) {
  await assertScope(userId, input.householdId, input.childProfileId);
  const db = getProfileDb();
  const cycle = await getActiveCharacterCreationCycle(userId, input.householdId, input.childProfileId);
  if (!cycle || cycle.startDirection !== "world_first")
    throw new Error("World-first creation cycle is required");
  const latestSummary = { ...(cycle.latestSummary ?? {}), worldFeeling: input.feeling };
  await db.update(characterCreationCycles).set({ currentStep: "world_character_suggestions", latestSummary, updatedAt: new Date() }).where(eq(characterCreationCycles.id, cycle.id));
  await db.insert(characterCreationSelections).values({ id: crypto.randomUUID(), cycleId: cycle.id, childProfileId: input.childProfileId, householdId: input.householdId, stepKey: "world_feeling", selectionKey: input.feeling, selectionPayload: { feeling: input.feeling }, selectedBy: "user" });
  return { id: cycle.id, startDirection: cycle.startDirection, currentStep: "world_character_suggestions", latestSummary };
}
export async function chooseWorldCharacterSuggestion(
  userId: string,
  input: { householdId: string; childProfileId: string; suggestion: { key: string; name: string; description: string; fitReason: string } },
) {
  await assertScope(userId, input.householdId, input.childProfileId);
  const db = getProfileDb();
  const cycle = await getActiveCharacterCreationCycle(userId, input.householdId, input.childProfileId);
  if (!cycle || cycle.startDirection !== "world_first") throw new Error("WORLD_FIRST_CYCLE_REQUIRED");
  const latestSummary = { ...(cycle.latestSummary ?? {}), characterArchetype: input.suggestion };
  await db.update(characterCreationCycles).set({ currentStep: "character_identity", latestSummary, updatedAt: new Date() }).where(eq(characterCreationCycles.id, cycle.id));
  await db.insert(characterCreationSelections).values({ id: crypto.randomUUID(), cycleId: cycle.id, childProfileId: input.childProfileId, householdId: input.householdId, stepKey: "world_character_suggestion", selectionKey: input.suggestion.key, selectionPayload: input.suggestion, selectedBy: "user" });
  return { id: cycle.id, currentStep: "character_identity", latestSummary };
}
export async function chooseCharacterIdentity(
  userId: string,
  input: { householdId: string; childProfileId: string; suggestion: { key: string; name: string; identity: string; traits: [string, string, string]; fitReason: string } },
) {
  await assertScope(userId, input.householdId, input.childProfileId);
  const db = getProfileDb();
  const cycle = await getActiveCharacterCreationCycle(userId, input.householdId, input.childProfileId);
  if (!cycle) throw new Error("CHARACTER_CREATION_CYCLE_REQUIRED");
  const latestSummary = { ...(cycle.latestSummary ?? {}), characterIdentity: input.suggestion };
  await db.update(characterCreationCycles).set({ currentStep: "origin", latestSummary, updatedAt: new Date() }).where(eq(characterCreationCycles.id, cycle.id));
  await db.insert(characterCreationSelections).values({ id: crypto.randomUUID(), cycleId: cycle.id, childProfileId: input.childProfileId, householdId: input.householdId, stepKey: "character_identity", selectionKey: input.suggestion.key, selectionPayload: input.suggestion, selectedBy: "user" });
  return { id: cycle.id, currentStep: "origin", latestSummary };
}
export async function chooseCharacterOrigin(
  userId: string,
  input: { householdId: string; childProfileId: string; origin: { key: string; name: string; description: string; fitReason: string } },
) {
  await assertScope(userId, input.householdId, input.childProfileId);
  const db = getProfileDb();
  const cycle = await getActiveCharacterCreationCycle(userId, input.householdId, input.childProfileId);
  if (!cycle) throw new Error("CHARACTER_CREATION_CYCLE_REQUIRED");
  if (cycle.currentStep !== "origin") throw new Error("CHARACTER_ORIGIN_STEP_REQUIRED");
  const latestSummary = { ...(cycle.latestSummary ?? {}), characterOrigin: input.origin };
  await db.update(characterCreationCycles).set({ currentStep: "region", latestSummary, updatedAt: new Date() }).where(eq(characterCreationCycles.id, cycle.id));
  await db.insert(characterCreationSelections).values({ id: crypto.randomUUID(), cycleId: cycle.id, childProfileId: input.childProfileId, householdId: input.householdId, stepKey: "origin", selectionKey: input.origin.key, selectionPayload: input.origin, selectedBy: "user" });
  return { id: cycle.id, currentStep: "region", latestSummary };
}
export async function chooseCharacterRegion(
  userId: string,
  input: { householdId: string; childProfileId: string; region: { key: string; name: string; description: string; fitReason?: string } },
) {
  await assertScope(userId, input.householdId, input.childProfileId);
  const db = getProfileDb();
  const cycle = await getActiveCharacterCreationCycle(userId, input.householdId, input.childProfileId);
  if (!cycle) throw new Error("CHARACTER_CREATION_CYCLE_REQUIRED");
  if (cycle.currentStep !== "region") throw new Error("CHARACTER_REGION_STEP_REQUIRED");
  const latestSummary = { ...(cycle.latestSummary ?? {}), characterRegion: input.region };
  await db.update(characterCreationCycles).set({ currentStep: "core_saga", latestSummary, updatedAt: new Date() }).where(eq(characterCreationCycles.id, cycle.id));
  await db.insert(characterCreationSelections).values({ id: crypto.randomUUID(), cycleId: cycle.id, childProfileId: input.childProfileId, householdId: input.householdId, stepKey: "region", selectionKey: input.region.key, selectionPayload: input.region, selectedBy: "user" });
  return { id: cycle.id, currentStep: "core_saga", latestSummary };
}
export async function chooseCharacterCoreSaga(
  userId: string,
  input: { householdId: string; childProfileId: string; saga: { key: string; title: string; description: string; fitReason?: string } },
) {
  await assertScope(userId, input.householdId, input.childProfileId);
  const db = getProfileDb();
  const cycle = await getActiveCharacterCreationCycle(userId, input.householdId, input.childProfileId);
  if (!cycle) throw new Error("CHARACTER_CREATION_CYCLE_REQUIRED");
  if (cycle.currentStep !== "core_saga") throw new Error("CHARACTER_CORE_SAGA_STEP_REQUIRED");
  const latestSummary = { ...(cycle.latestSummary ?? {}), characterCoreSaga: input.saga };
  await db.update(characterCreationCycles).set({ currentStep: "final_review", latestSummary, updatedAt: new Date() }).where(eq(characterCreationCycles.id, cycle.id));
  await db.insert(characterCreationSelections).values({ id: crypto.randomUUID(), cycleId: cycle.id, childProfileId: input.childProfileId, householdId: input.householdId, stepKey: "core_saga", selectionKey: input.saga.key, selectionPayload: input.saga, selectedBy: "user" });
  return { id: cycle.id, currentStep: "final_review", latestSummary };
}
export async function completeCharacterCreationCycle(
  userId: string,
  input: { householdId: string; childProfileId: string },
) {
  await assertScope(userId, input.householdId, input.childProfileId);
  const db = getProfileDb();
  const cycle = await getActiveCharacterCreationCycle(userId, input.householdId, input.childProfileId);
  if (!cycle) throw new Error("CHARACTER_CREATION_CYCLE_REQUIRED");
  if (cycle.currentStep !== "final_review") throw new Error("CHARACTER_FINAL_REVIEW_STEP_REQUIRED");
  const completedAt = new Date();
  await db.update(characterCreationCycles).set({ status: "completed", currentStep: "completed", completedAt, updatedAt: completedAt }).where(eq(characterCreationCycles.id, cycle.id));
  await db.insert(characterCreationSelections).values({ id: crypto.randomUUID(), cycleId: cycle.id, childProfileId: input.childProfileId, householdId: input.householdId, stepKey: "final_review", selectionKey: "confirmed", selectionPayload: { confirmed: true }, selectedBy: "user" });
  return { id: cycle.id, status: "completed" as const, currentStep: "completed", latestSummary: cycle.latestSummary };
}
