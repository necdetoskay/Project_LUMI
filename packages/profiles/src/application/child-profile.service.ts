import { getProfileDb } from "./db";
import { DrizzleHouseholdRepository } from "../db/repositories/drizzle/drizzle-household.repository";
import { DrizzleChildProfileRepository } from "../db/repositories/drizzle/drizzle-child-profile.repository";
import { AuthorizationError } from "../domain/errors";
import { validateAgeBand, validateDisplayName } from "../domain/validation";

export interface CreateChildProfileInput {
  householdId: string;
  displayName: string;
  ageBand: string;
}

export interface UpdateChildProfileInput {
  displayName?: string;
  ageBand?: string;
}

export interface ChildProfileResult {
  id: string;
  householdId: string;
  displayName: string;
  ageBand: string;
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

export async function createChildProfile(
  userId: string,
  input: CreateChildProfileInput,
): Promise<ChildProfileResult> {
  await assertMembership(input.householdId, userId);
  validateDisplayName(input.displayName);
  validateAgeBand(input.ageBand);

  const { childRepo } = getRepos();
  const profile = await childRepo.create({
    id: crypto.randomUUID(),
    householdId: input.householdId,
    displayName: input.displayName,
    ageBand: input.ageBand,
    locale: "tr-TR",
  });

  return {
    id: profile.id,
    householdId: profile.householdId,
    displayName: profile.displayName,
    ageBand: profile.ageBand,
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

  const { childRepo } = getRepos();
  const profile = await childRepo.update(profileId, householdId, input);

  return {
    id: profile.id,
    householdId: profile.householdId,
    displayName: profile.displayName,
    ageBand: profile.ageBand,
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
