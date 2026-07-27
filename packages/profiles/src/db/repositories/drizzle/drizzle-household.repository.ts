import { and, eq, isNull } from "drizzle-orm";

import type { QueryExecutor } from "../../client";
import {
  householdMembers,
  households,
  type HouseholdMemberRecord,
  type HouseholdRecord,
  type NewHouseholdMemberRecord,
  type NewHouseholdRecord,
} from "../../schema/profile";
import type { HouseholdRepository } from "../interfaces/household.repository";

export class DrizzleHouseholdRepository implements HouseholdRepository {
  constructor(private readonly db: QueryExecutor) {}

  async findById(id: string): Promise<HouseholdRecord | null> {
    const [record] = await this.db
      .select()
      .from(households)
      .where(and(eq(households.id, id), isNull(households.deletedAt)))
      .limit(1);
    return record ?? null;
  }

  async findByIdForUser(id: string, userId: string): Promise<HouseholdRecord | null> {
    const [record] = await this.db
      .select({
        id: households.id,
        name: households.name,
        slug: households.slug,
        createdAt: households.createdAt,
        updatedAt: households.updatedAt,
        deletedAt: households.deletedAt,
      })
      .from(households)
      .innerJoin(
        householdMembers,
        and(
          eq(households.id, householdMembers.householdId),
          eq(householdMembers.userId, userId),
          eq(householdMembers.isActive, true),
        ),
      )
      .where(and(eq(households.id, id), isNull(households.deletedAt)))
      .limit(1);
    return record ?? null;
  }

  async findByUserId(
    userId: string,
  ): Promise<(HouseholdRecord & { role: string })[]> {
    const rows = await this.db
      .select({
        id: households.id,
        name: households.name,
        slug: households.slug,
        createdAt: households.createdAt,
        updatedAt: households.updatedAt,
        deletedAt: households.deletedAt,
        role: householdMembers.membershipRole,
      })
      .from(households)
      .innerJoin(
        householdMembers,
        eq(households.id, householdMembers.householdId),
      )
      .where(
        and(
          eq(householdMembers.userId, userId),
          eq(householdMembers.isActive, true),
          isNull(households.deletedAt),
        ),
      );
    return rows as (HouseholdRecord & { role: string })[];
  }

  async create(input: NewHouseholdRecord): Promise<HouseholdRecord> {
    const [record] = await this.db.insert(households).values(input).returning();
    if (!record) {
      throw new Error("Household creation returned no record");
    }
    return record;
  }

  async softDelete(id: string, actorUserId: string): Promise<void> {
    const isOwner = await this.isOwner(id, actorUserId);
    if (!isOwner) {
      throw new Error("UNAUTHORIZED_HOUSEHOLD_DELETE");
    }

    await this.db
      .update(households)
      .set({ deletedAt: new Date() })
      .where(and(eq(households.id, id), isNull(households.deletedAt)));
  }

  async addMember(input: NewHouseholdMemberRecord): Promise<void> {
    await this.db.insert(householdMembers).values(input);
  }

  async removeMember(householdId: string, userId: string): Promise<void> {
    await this.db
      .update(householdMembers)
      .set({ isActive: false })
      .where(
        and(
          eq(householdMembers.householdId, householdId),
          eq(householdMembers.userId, userId),
        ),
      );
  }

  async getMembers(householdId: string): Promise<HouseholdMemberRecord[]> {
    return this.db
      .select()
      .from(householdMembers)
      .where(
        and(
          eq(householdMembers.householdId, householdId),
          eq(householdMembers.isActive, true),
        ),
      );
  }

  async isOwner(householdId: string, userId: string): Promise<boolean> {
    const [member] = await this.db
      .select()
      .from(householdMembers)
      .where(
        and(
          eq(householdMembers.householdId, householdId),
          eq(householdMembers.userId, userId),
          eq(householdMembers.isActive, true),
          eq(householdMembers.membershipRole, "owner"),
        ),
      )
      .limit(1);
    return member !== undefined;
  }
}
