import { and, eq, isNull } from "drizzle-orm";

import type { QueryExecutor } from "../../transaction";
import {
  childProfiles,
  type ChildProfileRecord,
  type NewChildProfileRecord,
} from "../../schema/profile";
import type { ChildProfileRepository } from "./child-profile.repository";

export class DrizzleChildProfileRepository
  implements ChildProfileRepository
{
  constructor(
    private readonly executor: QueryExecutor,
  ) {}

  async findById(id: string): Promise<ChildProfileRecord | null> {
    const [record] = await this.executor
      .select()
      .from(childProfiles)
      .where(
        and(
          eq(childProfiles.id, id),
          isNull(childProfiles.deletedAt),
        ),
      )
      .limit(1);

    return record ?? null;
  }

  async listByHousehold(
    householdId: string,
  ): Promise<ChildProfileRecord[]> {
    return this.executor
      .select()
      .from(childProfiles)
      .where(
        and(
          eq(childProfiles.householdId, householdId),
          isNull(childProfiles.deletedAt),
        ),
      );
  }

  async create(
    input: NewChildProfileRecord,
  ): Promise<ChildProfileRecord> {
    const [record] = await this.executor
      .insert(childProfiles)
      .values(input)
      .returning();

    if (!record) {
      throw new Error("Child profile creation returned no record");
    }

    return record;
  }
}
