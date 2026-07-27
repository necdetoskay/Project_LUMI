import { getProfileDb } from "./db";
import { DrizzleHouseholdRepository } from "../db/repositories/drizzle/drizzle-household.repository";
import { DrizzleChildProfileRepository } from "../db/repositories/drizzle/drizzle-child-profile.repository";

export interface OnboardingState {
  hasHousehold: boolean;
  householdId: string | null;
  householdName: string | null;
  childProfileCount: number;
  childProfiles: Array<{
    id: string;
    displayName: string;
    ageBand: string;
  }>;
}

function getRepos() {
  const db = getProfileDb();
  return {
    householdRepo: new DrizzleHouseholdRepository(db),
    childRepo: new DrizzleChildProfileRepository(db),
  };
}

export async function getOnboardingState(
  userId: string,
): Promise<OnboardingState> {
  const { householdRepo, childRepo } = getRepos();

  const households = await householdRepo.findByUserId(userId);
  const owned = households.find((h) => h.role === "owner");

  if (!owned) {
    return {
      hasHousehold: false,
      householdId: null,
      householdName: null,
      childProfileCount: 0,
      childProfiles: [],
    };
  }

  const profiles = await childRepo.listByHousehold(owned.id);

  return {
    hasHousehold: true,
    householdId: owned.id,
    householdName: owned.name,
    childProfileCount: profiles.length,
    childProfiles: profiles.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      ageBand: p.ageBand,
    })),
  };
}
