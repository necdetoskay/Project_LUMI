import { and, eq, isNull } from "drizzle-orm";

import type { QueryExecutor } from "../../client";
import {
  childPreferences,
  childProfiles,
  type ChildPreferenceRecord,
  type ChildProfileRecord,
  type NewChildPreferenceRecord,
  type NewChildProfileRecord,
} from "../../schema/profile";
import type { ChildProfileRepository } from "../interfaces/child-profile.repository";

export class DrizzleChildProfileRepository implements ChildProfileRepository {
  constructor(private readonly db: QueryExecutor) {}

  async findById(
    id: string,
    householdId: string,
  ): Promise<ChildProfileRecord | null> {
    const [record] = await this.db
      .select()
      .from(childProfiles)
      .where(
        and(
          eq(childProfiles.id, id),
          eq(childProfiles.householdId, householdId),
          isNull(childProfiles.deletedAt),
        ),
      )
      .limit(1);
    return record ?? null;
  }

  async findByIdIncludingDeleted(
    id: string,
    householdId: string,
  ): Promise<ChildProfileRecord | null> {
    const [record] = await this.db
      .select()
      .from(childProfiles)
      .where(
        and(
          eq(childProfiles.id, id),
          eq(childProfiles.householdId, householdId),
        ),
      )
      .limit(1);
    return record ?? null;
  }

  async listByHousehold(householdId: string): Promise<ChildProfileRecord[]> {
    return this.db
      .select()
      .from(childProfiles)
      .where(
        and(
          eq(childProfiles.householdId, householdId),
          isNull(childProfiles.deletedAt),
        ),
      );
  }

  async create(input: NewChildProfileRecord): Promise<ChildProfileRecord> {
    const [record] = await this.db
      .insert(childProfiles)
      .values(input)
      .returning();
    if (!record) {
      throw new Error("Child profile creation returned no record");
    }
    return record;
  }

  async update(
    id: string,
    householdId: string,
    input: Partial<NewChildProfileRecord>,
  ): Promise<ChildProfileRecord> {
    const [record] = await this.db
      .update(childProfiles)
      .set({ ...input, updatedAt: new Date() })
      .where(
        and(
          eq(childProfiles.id, id),
          eq(childProfiles.householdId, householdId),
          isNull(childProfiles.deletedAt),
        ),
      )
      .returning();
    if (!record) {
      throw new Error("Child profile not found for update");
    }
    return record;
  }

  async softDelete(id: string, householdId: string): Promise<void> {
    await this.db
      .update(childProfiles)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(childProfiles.id, id),
          eq(childProfiles.householdId, householdId),
          isNull(childProfiles.deletedAt),
        ),
      );
  }

  async hardDelete(id: string, householdId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(childProfiles)
      .where(
        and(
          eq(childProfiles.id, id),
          eq(childProfiles.householdId, householdId),
        ),
      )
      .returning({ id: childProfiles.id });
    return deleted.length > 0;
  }

  async findPreferences(
    childProfileId: string,
    householdId: string,
  ): Promise<ChildPreferenceRecord | null> {
    const [record] = await this.db
      .select({
        childProfileId: childPreferences.childProfileId,
        storyLength: childPreferences.storyLength,
        interactionLevel: childPreferences.interactionLevel,
        imageEnabled: childPreferences.imageEnabled,
        audioEnabled: childPreferences.audioEnabled,
        metadata: childPreferences.metadata,
      })
      .from(childPreferences)
      .innerJoin(
        childProfiles,
        and(
          eq(childPreferences.childProfileId, childProfiles.id),
          eq(childProfiles.householdId, householdId),
          isNull(childProfiles.deletedAt),
        ),
      )
      .where(eq(childPreferences.childProfileId, childProfileId))
      .limit(1);
    return record ?? null;
  }

  async upsertPreferences(
    householdId: string,
    input: NewChildPreferenceRecord,
  ): Promise<ChildPreferenceRecord> {
    const profile = await this.findById(input.childProfileId, householdId);
    if (!profile) {
      throw new Error("Child profile not found in household");
    }

    const [record] = await this.db
      .insert(childPreferences)
      .values(input)
      .onConflictDoUpdate({
        target: childPreferences.childProfileId,
        set: {
          storyLength: input.storyLength,
          interactionLevel: input.interactionLevel,
          imageEnabled: input.imageEnabled,
          audioEnabled: input.audioEnabled,
          metadata: input.metadata,
        },
      })
      .returning();
    if (!record) {
      throw new Error("Child preference upsert returned no record");
    }
    return record;
  }
}
