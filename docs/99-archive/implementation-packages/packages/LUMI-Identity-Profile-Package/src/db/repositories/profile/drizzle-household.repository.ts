import { and, eq, isNull } from "drizzle-orm";

import type { QueryExecutor } from "../../transaction";
import {
  householdMembers,
  households,
  type HouseholdRecord,
  type NewHouseholdRecord,
} from "../../schema/profile";
import type { HouseholdRepository } from "./household.repository";

export class DrizzleHouseholdRepository
  implements HouseholdRepository
{
  constructor(
    private readonly executor: QueryExecutor,
  ) {}

  async findById(id: string): Promise<HouseholdRecord | null> {
    const [record] = await this.executor
      .select()
      .from(households)
      .where(
        and(
          eq(households.id, id),
          isNull(households.deletedAt),
        ),
      )
      .limit(1);

    return record ?? null;
  }

  async create(
    input: NewHouseholdRecord,
  ): Promise<HouseholdRecord> {
    const [record] = await this.executor
      .insert(households)
      .values(input)
      .returning();

    if (!record) {
      throw new Error("Household creation returned no record");
    }

    return record;
  }

  async addMember(input: {
    householdId: string;
    userId: string;
    membershipRole: "owner" | "guardian" | "member";
  }): Promise<void> {
    await this.executor
      .insert(householdMembers)
      .values(input);
  }
}
