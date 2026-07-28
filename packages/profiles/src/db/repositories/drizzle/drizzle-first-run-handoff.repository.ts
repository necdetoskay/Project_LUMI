import { and, desc, eq, isNull } from "drizzle-orm";

import type { QueryExecutor } from "../../../db/client";
import {
  childProfiles,
  firstRunHandoffs,
  type FirstRunHandoffRecord,
  type NewFirstRunHandoffRecord,
} from "../../../db/schema/profile";
import type { FirstRunHandoffRepository } from "../interfaces/first-run-handoff.repository";

export class DrizzleFirstRunHandoffRepository implements FirstRunHandoffRepository {
  constructor(private readonly db: QueryExecutor) {}

  async findById(
    id: string,
    householdId: string,
  ): Promise<FirstRunHandoffRecord | null> {
    const [record] = await this.db
      .select({
        id: firstRunHandoffs.id,
        childProfileId: firstRunHandoffs.childProfileId,
        characterType: firstRunHandoffs.characterType,
        originMode: firstRunHandoffs.originMode,
        payload: firstRunHandoffs.payload,
        createdAt: firstRunHandoffs.createdAt,
        updatedAt: firstRunHandoffs.updatedAt,
        deletedAt: firstRunHandoffs.deletedAt,
      })
      .from(firstRunHandoffs)
      .innerJoin(
        childProfiles,
        and(
          eq(firstRunHandoffs.childProfileId, childProfiles.id),
          eq(childProfiles.householdId, householdId),
        ),
      )
      .where(
        and(
          eq(firstRunHandoffs.id, id),
          isNull(firstRunHandoffs.deletedAt),
        ),
      )
      .limit(1);
    return (record as FirstRunHandoffRecord) ?? null;
  }

  async findLatestByChildProfile(
    childProfileId: string,
    householdId: string,
  ): Promise<FirstRunHandoffRecord | null> {
    const rows = await this.db
      .select({
        id: firstRunHandoffs.id,
        childProfileId: firstRunHandoffs.childProfileId,
        characterType: firstRunHandoffs.characterType,
        originMode: firstRunHandoffs.originMode,
        payload: firstRunHandoffs.payload,
        createdAt: firstRunHandoffs.createdAt,
        updatedAt: firstRunHandoffs.updatedAt,
        deletedAt: firstRunHandoffs.deletedAt,
      })
      .from(firstRunHandoffs)
      .innerJoin(
        childProfiles,
        and(
          eq(firstRunHandoffs.childProfileId, childProfiles.id),
          eq(childProfiles.id, childProfileId),
          eq(childProfiles.householdId, householdId),
        ),
      )
      .where(isNull(firstRunHandoffs.deletedAt))
      .orderBy(desc(firstRunHandoffs.createdAt))
      .limit(1);
    return (rows[0] as FirstRunHandoffRecord) ?? null;
  }

  async listByChildProfile(
    childProfileId: string,
    householdId: string,
  ): Promise<FirstRunHandoffRecord[]> {
    const rows = await this.db
      .select({
        id: firstRunHandoffs.id,
        childProfileId: firstRunHandoffs.childProfileId,
        characterType: firstRunHandoffs.characterType,
        originMode: firstRunHandoffs.originMode,
        payload: firstRunHandoffs.payload,
        createdAt: firstRunHandoffs.createdAt,
        updatedAt: firstRunHandoffs.updatedAt,
        deletedAt: firstRunHandoffs.deletedAt,
      })
      .from(firstRunHandoffs)
      .innerJoin(
        childProfiles,
        and(
          eq(firstRunHandoffs.childProfileId, childProfiles.id),
          eq(childProfiles.id, childProfileId),
          eq(childProfiles.householdId, householdId),
        ),
      )
      .where(isNull(firstRunHandoffs.deletedAt))
      .orderBy(desc(firstRunHandoffs.createdAt));
    return rows as FirstRunHandoffRecord[];
  }

  async create(input: NewFirstRunHandoffRecord): Promise<FirstRunHandoffRecord> {
    const [record] = await this.db
      .insert(firstRunHandoffs)
      .values(input)
      .returning();
    if (!record) {
      throw new Error("First-run handoff creation returned no record");
    }
    return record as FirstRunHandoffRecord;
  }

  async softDelete(id: string, householdId: string): Promise<void> {
    const record = await this.findById(id, householdId);
    if (!record) {
      return;
    }
    await this.db
      .update(firstRunHandoffs)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(firstRunHandoffs.id, id),
          isNull(firstRunHandoffs.deletedAt),
        ),
      );
  }
}
