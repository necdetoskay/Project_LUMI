import postgres from "postgres";

const PostgresError = postgres.PostgresError;

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

function isMissingSchemaError(err: unknown): boolean {
  if (err instanceof PostgresError) {
    return (
      err.code === "42P01" || // undefined_table
      err.code === "3F000" || // schema_does_not_exist
      err.message?.includes("does not exist")
    );
  }
  if (err instanceof Error) {
    return (
      err.message?.includes("relation") && err.message?.includes("does not exist")
    );
  }
  return false;
}

export async function getOnboardingState(
  userId: string,
): Promise<OnboardingState> {
  const { householdRepo, childRepo } = getRepos();

  let households;
  try {
    households = await householdRepo.findByUserId(userId);
  } catch (err) {
    if (isMissingSchemaError(err)) {
      console.error(
        "[onboarding] Profile schema missing — run `pnpm db:migrate`",
        err,
      );
      throw new Error(
        "PROFILE_SCHEMA_MISSING: Profile tables do not exist. Run `pnpm db:migrate` to apply migrations.",
      );
    }
    throw err;
  }
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
