import { getProfileDb } from "./db";
import { DrizzleHouseholdRepository } from "../db/repositories/drizzle/drizzle-household.repository";
import { DrizzleParentPolicyRepository } from "../db/repositories/drizzle/drizzle-parent-policy.repository";
import { AuthorizationError, DomainError } from "../domain/errors";

export interface CreateHouseholdInput {
  name: string;
  slug: string;
}

export interface HouseholdResult {
  id: string;
  name: string;
  slug: string;
  role: string;
  createdAt: Date;
}

function getRepos() {
  const db = getProfileDb();
  return {
    householdRepo: new DrizzleHouseholdRepository(db),
    policyRepo: new DrizzleParentPolicyRepository(db),
  };
}

export async function createHousehold(
  userId: string,
  input: CreateHouseholdInput,
): Promise<HouseholdResult> {
  const { householdRepo, policyRepo } = getRepos();

  const existing = await householdRepo.findByUserId(userId);
  const activeHousehold = existing.find((h) => h.role === "owner");
  if (activeHousehold) {
    throw new DomainError(
      "HOUSEHOLD_EXISTS",
      "User already owns a household",
    );
  }

  const household = await householdRepo.create({
    id: crypto.randomUUID(),
    name: input.name,
    slug: input.slug,
  });

  await householdRepo.addMember({
    householdId: household.id,
    userId,
    membershipRole: "owner",
    isActive: true,
    joinedAt: new Date(),
  });

  await policyRepo.upsert({ householdId: household.id }, userId);

  return {
    id: household.id,
    name: household.name,
    slug: household.slug,
    role: "owner",
    createdAt: household.createdAt,
  };
}

export async function getOwnedHousehold(
  userId: string,
): Promise<HouseholdResult | null> {
  const { householdRepo } = getRepos();
  const households = await householdRepo.findByUserId(userId);
  const owned = households.find((h) => h.role === "owner");
  if (!owned) return null;

  return {
    id: owned.id,
    name: owned.name,
    slug: owned.slug,
    role: owned.role,
    createdAt: owned.createdAt,
  };
}

export async function getHouseholdForUser(
  householdId: string,
  userId: string,
): Promise<HouseholdResult | null> {
  const { householdRepo } = getRepos();
  const household = await householdRepo.findByIdForUser(householdId, userId);
  if (!household) return null;

  const memberships = await householdRepo.findByUserId(userId);
  const membership = memberships.find((item) => item.id === household.id);
  if (!membership) return null;

  return {
    id: household.id,
    name: household.name,
    slug: household.slug,
    role: membership.role,
    createdAt: household.createdAt,
  };
}

export async function assertHouseholdOwnership(
  householdId: string,
  userId: string,
): Promise<void> {
  const { householdRepo } = getRepos();
  const isOwner = await householdRepo.isOwner(householdId, userId);
  if (!isOwner) {
    throw new AuthorizationError(
      "User does not own this household",
    );
  }
}
