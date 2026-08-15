import { and, desc, eq } from "drizzle-orm";
import { getProfileDb } from "./db";
import { DrizzleHouseholdRepository } from "../db/repositories/drizzle/drizzle-household.repository";
import {
  characterCreationCycles,
  characterCreationSelections,
  characterOriginPackages,
  childProfiles,
  lumiCharacters,
  parentalSettings,
  type CharacterCreationDirection,
} from "../db/schema/profile";
import { AuthorizationError } from "../domain/errors";
import type { SafetyBounds } from "../domain/types";

export type WorldFeelingKey =
  | "oceanic"
  | "sky_islands"
  | "enchanted_forest"
  | "crystal_caverns"
  | "desert_ruins"
  | "living_city";

type NamedChoice = { key: string; name: string; description?: string; fitReason?: string };
type IdentityChoice = NamedChoice & { identity: string; traits: [string, string, string] };
type SagaChoice = { key: string; title: string; description: string; fitReason?: string };
type FinalizationSummary = {
  characterArchetype?: NamedChoice;
  characterIdentity?: IdentityChoice;
  characterOrigin?: NamedChoice;
  characterRegion?: NamedChoice;
  characterCoreSaga?: SagaChoice;
  worldFeeling?: WorldFeelingKey;
};

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
  if (existing) await db.update(characterCreationCycles).set({ startDirection: input.direction, currentStep: nextStep, latestSummary: { ...(existing.latestSummary ?? {}), startDirection: input.direction }, updatedAt: new Date() }).where(eq(characterCreationCycles.id, existing.id));
  else await db.insert(characterCreationCycles).values({ id: cycleId, childProfileId: input.childProfileId, householdId: input.householdId, startDirection: input.direction, currentStep: nextStep, latestSummary: { startDirection: input.direction } });
  await db.insert(characterCreationSelections).values({ id: crypto.randomUUID(), cycleId, childProfileId: input.childProfileId, householdId: input.householdId, stepKey: "start", selectionKey: input.direction, selectionPayload: { direction: input.direction }, selectedBy: "user" });
  return { id: cycleId, startDirection: input.direction, currentStep: nextStep };
}

export async function chooseWorldFeeling(userId: string, input: { householdId: string; childProfileId: string; feeling: WorldFeelingKey }) {
  await assertScope(userId, input.householdId, input.childProfileId);
  const db = getProfileDb();
  const cycle = await getActiveCharacterCreationCycle(userId, input.householdId, input.childProfileId);
  if (!cycle || cycle.startDirection !== "world_first") throw new Error("World-first creation cycle is required");
  const latestSummary = { ...(cycle.latestSummary ?? {}), worldFeeling: input.feeling };
  await db.update(characterCreationCycles).set({ currentStep: "world_character_suggestions", latestSummary, updatedAt: new Date() }).where(eq(characterCreationCycles.id, cycle.id));
  await db.insert(characterCreationSelections).values({ id: crypto.randomUUID(), cycleId: cycle.id, childProfileId: input.childProfileId, householdId: input.householdId, stepKey: "world_feeling", selectionKey: input.feeling, selectionPayload: { feeling: input.feeling }, selectedBy: "user" });
  return { id: cycle.id, startDirection: cycle.startDirection, currentStep: "world_character_suggestions", latestSummary };
}

export async function chooseWorldCharacterSuggestion(userId: string, input: { householdId: string; childProfileId: string; suggestion: { key: string; name: string; description: string; fitReason: string } }) {
  await assertScope(userId, input.householdId, input.childProfileId);
  const db = getProfileDb();
  const cycle = await getActiveCharacterCreationCycle(userId, input.householdId, input.childProfileId);
  if (!cycle || cycle.startDirection !== "world_first") throw new Error("WORLD_FIRST_CYCLE_REQUIRED");
  const latestSummary = { ...(cycle.latestSummary ?? {}), characterArchetype: input.suggestion };
  await db.update(characterCreationCycles).set({ currentStep: "character_identity", latestSummary, updatedAt: new Date() }).where(eq(characterCreationCycles.id, cycle.id));
  await db.insert(characterCreationSelections).values({ id: crypto.randomUUID(), cycleId: cycle.id, childProfileId: input.childProfileId, householdId: input.householdId, stepKey: "world_character_suggestion", selectionKey: input.suggestion.key, selectionPayload: input.suggestion, selectedBy: "user" });
  return { id: cycle.id, currentStep: "character_identity", latestSummary };
}

export async function chooseCharacterIdentity(userId: string, input: { householdId: string; childProfileId: string; suggestion: { key: string; name: string; identity: string; traits: [string, string, string]; fitReason: string } }) {
  await assertScope(userId, input.householdId, input.childProfileId);
  const db = getProfileDb();
  const cycle = await getActiveCharacterCreationCycle(userId, input.householdId, input.childProfileId);
  if (!cycle) throw new Error("CHARACTER_CREATION_CYCLE_REQUIRED");
  const latestSummary = { ...(cycle.latestSummary ?? {}), characterIdentity: input.suggestion };
  await db.update(characterCreationCycles).set({ currentStep: "origin", latestSummary, updatedAt: new Date() }).where(eq(characterCreationCycles.id, cycle.id));
  await db.insert(characterCreationSelections).values({ id: crypto.randomUUID(), cycleId: cycle.id, childProfileId: input.childProfileId, householdId: input.householdId, stepKey: "character_identity", selectionKey: input.suggestion.key, selectionPayload: input.suggestion, selectedBy: "user" });
  return { id: cycle.id, currentStep: "origin", latestSummary };
}

export async function chooseCharacterOrigin(userId: string, input: { householdId: string; childProfileId: string; origin: { key: string; name: string; description: string; fitReason: string } }) {
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

export async function chooseCharacterRegion(userId: string, input: { householdId: string; childProfileId: string; region: { key: string; name: string; description: string; fitReason?: string } }) {
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

export async function chooseCharacterCoreSaga(userId: string, input: { householdId: string; childProfileId: string; saga: { key: string; title: string; description: string; fitReason?: string } }) {
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

function requireChoice<T>(value: T | undefined, code: string): T {
  if (!value) throw new Error(code);
  return value;
}

function deriveCharacterType(summary: FinalizationSummary): "explorer" | "inventor" | "storyteller" | "helper" | "dreamer" {
  const haystack = `${summary.characterArchetype?.key ?? ""} ${summary.characterIdentity?.key ?? ""} ${summary.characterIdentity?.identity ?? ""}`.toLowerCase();
  if (/invent|maker|engineer|tinker|mucit|tasar/.test(haystack)) return "inventor";
  if (/story|tale|bard|anlat|hikaye/.test(haystack)) return "storyteller";
  if (/help|heal|care|guardian|yard|koru/.test(haystack)) return "helper";
  if (/dream|imagin|vision|hayal|dus/.test(haystack)) return "dreamer";
  return "explorer";
}

function deriveBroadKind(summary: FinalizationSummary): "human" | "animal" | "fantasy" | "robot" | "sea_creature" | "sky_creature" {
  const haystack = `${summary.characterArchetype?.key ?? ""} ${summary.characterArchetype?.name ?? ""} ${summary.characterIdentity?.identity ?? ""}`.toLowerCase();
  if (/robot|android|mekanik/.test(haystack)) return "robot";
  if (/sea|ocean|mermaid|deniz/.test(haystack)) return "sea_creature";
  if (/sky|bird|wing|gok|kanat/.test(haystack)) return "sky_creature";
  if (/animal|cat|dog|fox|wolf|bear|hayvan|kedi|kopek|tilki|kurt|ayi/.test(haystack)) return "animal";
  if (/fantasy|magic|dragon|fairy|elf|buyu|ejder|peri/.test(haystack)) return "fantasy";
  return "human";
}

export async function completeCharacterCreationCycle(userId: string, input: { householdId: string; childProfileId: string }) {
  await assertScope(userId, input.householdId, input.childProfileId);
  const db = getProfileDb();
  const cycle = await getActiveCharacterCreationCycle(userId, input.householdId, input.childProfileId);
  if (!cycle) throw new Error("CHARACTER_CREATION_CYCLE_REQUIRED");
  if (cycle.currentStep !== "final_review") throw new Error("CHARACTER_FINAL_REVIEW_STEP_REQUIRED");

  const summary = cycle.latestSummary as FinalizationSummary;
  const identity = requireChoice(summary.characterIdentity, "CHARACTER_IDENTITY_REQUIRED");
  const origin = requireChoice(summary.characterOrigin, "CHARACTER_ORIGIN_REQUIRED");
  const region = requireChoice(summary.characterRegion, "CHARACTER_REGION_REQUIRED");
  const saga = requireChoice(summary.characterCoreSaga, "CHARACTER_CORE_SAGA_REQUIRED");
  const archetype = summary.characterArchetype;

  return db.transaction(async (tx) => {
    const [profile] = await tx.select().from(childProfiles).where(and(eq(childProfiles.id, input.childProfileId), eq(childProfiles.householdId, input.householdId))).limit(1);
    if (!profile || profile.deletedAt) throw new Error("CHARACTER_PROFILE_UNAVAILABLE");
    const [policy] = await tx.select().from(parentalSettings).where(eq(parentalSettings.householdId, input.householdId)).limit(1);
    if (!policy) throw new Error("MISSING_PARENT_POLICY");
    const [existingCharacter] = await tx.select({ id: lumiCharacters.id }).from(lumiCharacters).where(and(eq(lumiCharacters.childProfileId, input.childProfileId), eq(lumiCharacters.householdId, input.householdId))).limit(1);
    if (existingCharacter) throw new Error("CHARACTER_ALREADY_EXISTS");

    const safetyBounds: SafetyBounds = {
      ageBand: profile.ageBand as SafetyBounds["ageBand"],
      contentBoundary: policy.contentBoundary as SafetyBounds["contentBoundary"],
      requireParentApprovalForAi: policy.requireParentApprovalForAi,
    };
    const originPackageId = crypto.randomUUID();
    const characterId = crypto.randomUUID();
    const broadKind = deriveBroadKind(summary);
    const characterType = deriveCharacterType(summary);
    const subtype = (archetype?.name ?? identity.identity).slice(0, 80);
    const universeSeed = `cycle:${cycle.id}`.slice(0, 120);
    const nearbyNpcSeed = `A trusted local connected to ${region.name}`.slice(0, 500);
    const firstMysterySeed = saga.description.slice(0, 500);
    const homeArchetype = `${region.name} home`.slice(0, 120);

    await tx.insert(characterOriginPackages).values({
      id: originPackageId,
      childProfileId: input.childProfileId,
      householdId: input.householdId,
      broadKind,
      characterType,
      subtype,
      originMode: "manual",
      universeSeed,
      createdBy: "system",
      accepted: true,
      payload: {
        originConcept: origin.description ?? origin.name,
        startingRegionArchetype: region.name.slice(0, 120),
        startingLocation: region.name.slice(0, 200),
        homeArchetype,
        nearbyNpcSeed,
        firstMysterySeed,
        toneVector: [],
        noveltyMarkers: [origin.key, region.key, saga.key].filter(Boolean),
        safetyBounds,
      },
      generationSource: "character_creation_v2",
    });

    await tx.insert(lumiCharacters).values({
      id: characterId,
      childProfileId: input.childProfileId,
      householdId: input.householdId,
      name: identity.name.slice(0, 120),
      broadKind,
      characterType,
      subtype,
      originMode: "manual",
      firstOriginPackageId: originPackageId,
      originConcept: (origin.description ?? origin.name).slice(0, 500),
      startingRegionArchetype: region.name.slice(0, 120),
      startingLocation: region.name.slice(0, 200),
      homeArchetype,
      nearbyNpcSeed,
      firstMysterySeed,
      universeSeed,
      safetyBounds,
    });

    const completedAt = new Date();
    await tx.update(characterCreationCycles).set({ status: "completed", currentStep: "completed", completedAt, updatedAt: completedAt }).where(and(eq(characterCreationCycles.id, cycle.id), eq(characterCreationCycles.status, "draft")));
    await tx.insert(characterCreationSelections).values({ id: crypto.randomUUID(), cycleId: cycle.id, childProfileId: input.childProfileId, householdId: input.householdId, stepKey: "final_review", selectionKey: "confirmed", selectionPayload: { confirmed: true, characterId, originPackageId }, selectedBy: "user" });
    return { id: cycle.id, status: "completed" as const, currentStep: "completed", characterId, originPackageId, latestSummary: cycle.latestSummary };
  });
}
