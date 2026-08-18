import { getProfileDb } from "./db";
import { DrizzleHouseholdRepository } from "../db/repositories/drizzle/drizzle-household.repository";
import { DrizzleChildProfileRepository } from "../db/repositories/drizzle/drizzle-child-profile.repository";
import { AuthorizationError } from "../domain/errors";
import {
  ageBandForAgeYears,
  validateAgeBand,
  validateAgeYears,
  validateDisplayName,
} from "../domain/validation";

export interface CreateChildProfileInput {
  householdId: string;
  displayName: string;
  ageBand?: string;
  ageYears?: number;
}

export interface UpdateChildProfileInput {
  displayName?: string;
  ageBand?: string;
  ageYears?: number;
}

export interface ChildProfileResult {
  id: string;
  householdId: string;
  displayName: string;
  ageBand: string;
  ageYears: number | null;
  locale: string;
  createdAt: Date;
}

function getRepos() {
  const db = getProfileDb();
  return {
    householdRepo: new DrizzleHouseholdRepository(db),
    childRepo: new DrizzleChildProfileRepository(db),
  };
}

async function assertMembership(
  householdId: string,
  userId: string,
): Promise<void> {
  const { householdRepo } = getRepos();
  const record = await householdRepo.findByIdForUser(householdId, userId);
  if (!record) {
    throw new AuthorizationError("User is not a member of this household");
  }
}

function exactAgeFromRecord(profile: {
  ageYears: number | null;
  metadata: { ageYears?: number };
}): number | null {
  return profile.ageYears ?? profile.metadata.ageYears ?? null;
}

export async function createChildProfile(
  userId: string,
  input: CreateChildProfileInput,
): Promise<ChildProfileResult> {
  await assertMembership(input.householdId, userId);
  validateDisplayName(input.displayName);
  const ageYears =
    input.ageYears === undefined ? undefined : validateAgeYears(input.ageYears);
  const ageBand =
    ageYears === undefined
      ? validateAgeBand(input.ageBand ?? "")
      : ageBandForAgeYears(ageYears);

  const { childRepo } = getRepos();
  const profile = await childRepo.create({
    id: crypto.randomUUID(),
    householdId: input.householdId,
    displayName: input.displayName,
    ageBand,
    ageYears,
    locale: "tr-TR",
  });

  return {
    id: profile.id,
    householdId: profile.householdId,
    displayName: profile.displayName,
    ageBand: profile.ageBand,
    ageYears: exactAgeFromRecord(profile),
    locale: profile.locale,
    createdAt: profile.createdAt,
  };
}

export async function listChildProfiles(
  userId: string,
  householdId: string,
): Promise<ChildProfileResult[]> {
  await assertMembership(householdId, userId);

  const { childRepo } = getRepos();
  const profiles = await childRepo.listByHousehold(householdId);

  return profiles.map((p) => ({
    id: p.id,
    householdId: p.householdId,
    displayName: p.displayName,
    ageBand: p.ageBand,
    ageYears: exactAgeFromRecord(p),
    locale: p.locale,
    createdAt: p.createdAt,
  }));
}

export async function updateChildProfile(
  userId: string,
  profileId: string,
  householdId: string,
  input: UpdateChildProfileInput,
): Promise<ChildProfileResult> {
  await assertMembership(householdId, userId);

  if (input.displayName !== undefined) {
    validateDisplayName(input.displayName);
  }
  if (input.ageBand !== undefined) {
    validateAgeBand(input.ageBand);
  }
  if (input.ageYears !== undefined) {
    validateAgeYears(input.ageYears);
  }

  const update: {
    displayName?: string;
    ageBand?: string;
    ageYears?: number;
  } = {};
  if (input.displayName !== undefined) {
    update.displayName = input.displayName;
  }
  if (input.ageYears !== undefined) {
    update.ageBand = ageBandForAgeYears(input.ageYears);
    update.ageYears = input.ageYears;
  } else if (input.ageBand !== undefined) {
    update.ageBand = input.ageBand;
  }

  const { childRepo } = getRepos();
  const profile = await childRepo.update(profileId, householdId, update);

  return {
    id: profile.id,
    householdId: profile.householdId,
    displayName: profile.displayName,
    ageBand: profile.ageBand,
    ageYears: exactAgeFromRecord(profile),
    locale: profile.locale,
    createdAt: profile.createdAt,
  };
}

export async function archiveChildProfile(
  userId: string,
  profileId: string,
  householdId: string,
): Promise<void> {
  await assertMembership(householdId, userId);

  const { childRepo } = getRepos();
  await childRepo.softDelete(profileId, householdId);
}

export async function deleteChildProfile(
  userId: string,
  profileId: string,
  householdId: string,
): Promise<void> {
  await assertMembership(householdId, userId);

  const { childRepo } = getRepos();
  const deleted = await childRepo.hardDelete(profileId, householdId);
  if (!deleted) {
    throw new Error("Child profile not found");
  }
}

export async function findChildProfileForUser(
  profileId: string,
  userId: string,
  householdId: string,
): Promise<ChildProfileResult | null> {
  await assertMembership(householdId, userId);

  const { childRepo } = getRepos();
  const profile = await childRepo.findById(profileId, householdId);
  if (!profile) return null;

  return {
    id: profile.id,
    householdId: profile.householdId,
    displayName: profile.displayName,
    ageBand: profile.ageBand,
    ageYears: exactAgeFromRecord(profile),
    locale: profile.locale,
    createdAt: profile.createdAt,
  };
}

export interface ChildPreferenceResult {
  childProfileId: string;
  storyLength: string;
  interactionLevel: number;
  imageEnabled: boolean;
  audioEnabled: boolean;
}

export async function getChildProfilePreferences(
  profileId: string,
  userId: string,
  householdId: string,
): Promise<ChildPreferenceResult | null> {
  await assertMembership(householdId, userId);

  const { childRepo } = getRepos();
  const preferences = await childRepo.findPreferences(profileId, householdId);
  if (!preferences) return null;

  return {
    childProfileId: preferences.childProfileId,
    storyLength: preferences.storyLength,
    interactionLevel: preferences.interactionLevel,
    imageEnabled: preferences.imageEnabled,
    audioEnabled: preferences.audioEnabled,
  };
}
