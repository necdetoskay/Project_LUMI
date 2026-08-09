import { getProfileDb } from "./db";
import { DrizzleHouseholdRepository } from "../db/repositories/drizzle/drizzle-household.repository";
import { DrizzleChildProfileRepository } from "../db/repositories/drizzle/drizzle-child-profile.repository";
import { AuthorizationError } from "../domain/errors";
import type { ChildProfileMetadata } from "../domain/types";

export const CHILD_INTERESTS = [
  "dinosaurs",
  "space",
  "animals",
  "sea",
  "fantasy",
  "vehicles",
  "puzzles",
  "sports",
  "art",
  "nature",
  "robots",
  "science",
] as const;

export const DEVELOPMENT_GOALS = [
  "sharing",
  "self_expression",
  "social_interaction",
  "empathy",
  "patience",
  "confidence",
  "problem_solving",
  "resilience",
  "responsibility",
  "listening",
] as const;

export type ChildInterest = (typeof CHILD_INTERESTS)[number];
export type DevelopmentGoal = (typeof DEVELOPMENT_GOALS)[number];

export interface ChildPersonalizationMetadata extends ChildProfileMetadata {
  interests?: ChildInterest[];
  customInterests?: string[];
  developmentGoals?: DevelopmentGoal[];
}

export interface ChildPersonalizationResult {
  childProfileId: string;
  interests: ChildInterest[];
  customInterests: string[];
  developmentGoals: DevelopmentGoal[];
}

export interface UpdateChildPersonalizationInput {
  interests: ChildInterest[];
  customInterests: string[];
  developmentGoals: DevelopmentGoal[];
}

function getRepos() {
  const db = getProfileDb();
  return {
    householdRepo: new DrizzleHouseholdRepository(db),
    childRepo: new DrizzleChildProfileRepository(db),
  };
}

async function assertMembership(householdId: string, userId: string) {
  const { householdRepo } = getRepos();
  const record = await householdRepo.findByIdForUser(householdId, userId);
  if (!record) {
    throw new AuthorizationError("User is not a member of this household");
  }
}

function normalizeCustomInterests(values: string[]) {
  return [
    ...new Set(values.map((value) => value.trim()).filter(Boolean)),
  ].slice(0, 12);
}

function assertAllowedValues<T extends string>(
  values: string[],
  allowed: readonly T[],
  field: string,
): asserts values is T[] {
  const allowedSet = new Set<string>(allowed);
  if (values.some((value) => !allowedSet.has(value))) {
    throw new Error(`ValidationError: invalid ${field}`);
  }
}

export async function getChildPersonalization(
  userId: string,
  profileId: string,
  householdId: string,
): Promise<ChildPersonalizationResult> {
  await assertMembership(householdId, userId);
  const { childRepo } = getRepos();
  const profile = await childRepo.findById(profileId, householdId);
  if (!profile) {
    throw new Error("Child profile not found");
  }

  const metadata = (profile.metadata ?? {}) as ChildPersonalizationMetadata;
  return {
    childProfileId: profile.id,
    interests: metadata.interests ?? [],
    customInterests: metadata.customInterests ?? [],
    developmentGoals: metadata.developmentGoals ?? [],
  };
}

export async function updateChildPersonalization(
  userId: string,
  profileId: string,
  householdId: string,
  input: UpdateChildPersonalizationInput,
): Promise<ChildPersonalizationResult> {
  await assertMembership(householdId, userId);
  assertAllowedValues(input.interests, CHILD_INTERESTS, "interests");
  assertAllowedValues(
    input.developmentGoals,
    DEVELOPMENT_GOALS,
    "developmentGoals",
  );

  const { childRepo } = getRepos();
  const profile = await childRepo.findById(profileId, householdId);
  if (!profile) {
    throw new Error("Child profile not found");
  }

  const metadata = (profile.metadata ?? {}) as ChildPersonalizationMetadata;
  const nextMetadata: ChildPersonalizationMetadata = {
    ...metadata,
    interests: [...new Set(input.interests)].slice(0, 12),
    customInterests: normalizeCustomInterests(input.customInterests),
    developmentGoals: [...new Set(input.developmentGoals)].slice(0, 8),
  };

  const updated = await childRepo.update(profileId, householdId, {
    metadata: nextMetadata,
  });
  const updatedMetadata = updated.metadata as ChildPersonalizationMetadata;

  return {
    childProfileId: updated.id,
    interests: updatedMetadata.interests ?? [],
    customInterests: updatedMetadata.customInterests ?? [],
    developmentGoals: updatedMetadata.developmentGoals ?? [],
  };
}
