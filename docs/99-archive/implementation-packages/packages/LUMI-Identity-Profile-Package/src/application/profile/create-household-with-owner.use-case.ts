import type { QueryExecutor } from "../../db/transaction";
import { withTransaction } from "../../db/transaction";
import { DrizzleHouseholdRepository } from "../../db/repositories/profile/drizzle-household.repository";
import { parentalSettings } from "../../db/schema/profile";

export type CreateHouseholdWithOwnerInput = {
  userId: string;
  householdName: string;
  slug: string;
};

export async function createHouseholdWithOwner(
  input: CreateHouseholdWithOwnerInput,
) {
  return withTransaction(async (tx) => {
    const repository = new DrizzleHouseholdRepository(tx);

    const household = await repository.create({
      name: input.householdName,
      slug: input.slug,
    });

    await repository.addMember({
      householdId: household.id,
      userId: input.userId,
      membershipRole: "owner",
    });

    await tx.insert(parentalSettings).values({
      householdId: household.id,
    });

    return household;
  });
}
