import { and, eq } from "drizzle-orm";

import type { QueryExecutor } from "../../client";
import {
  householdMembers,
  parentalSettings,
  policyAuditLog,
  type NewParentalSettingRecord,
  type NewPolicyAuditLogRecord,
  type ParentalSettingRecord,
  type PolicyAuditLogRecord,
} from "../../schema/profile";
import type { ParentPolicyRepository } from "../interfaces/parent-policy.repository";

export class DrizzleParentPolicyRepository implements ParentPolicyRepository {
  constructor(private readonly db: QueryExecutor) {}

  async findByHousehold(
    householdId: string,
    actorUserId: string,
  ): Promise<ParentalSettingRecord | null> {
    const [record] = await this.db
      .select({
        householdId: parentalSettings.householdId,
        maxDailyStories: parentalSettings.maxDailyStories,
        contentBoundary: parentalSettings.contentBoundary,
        timeLimitMinutes: parentalSettings.timeLimitMinutes,
        requireParentApprovalForAi: parentalSettings.requireParentApprovalForAi,
        allowImageGeneration: parentalSettings.allowImageGeneration,
        allowTts: parentalSettings.allowTts,
        safetyMetadata: parentalSettings.safetyMetadata,
      })
      .from(parentalSettings)
      .innerJoin(
        householdMembers,
        and(
          eq(parentalSettings.householdId, householdMembers.householdId),
          eq(householdMembers.userId, actorUserId),
          eq(householdMembers.isActive, true),
        ),
      )
      .where(eq(parentalSettings.householdId, householdId))
      .limit(1);
    return record ?? null;
  }

  async upsert(
    input: NewParentalSettingRecord,
    actorUserId: string,
  ): Promise<ParentalSettingRecord> {
    const [membership] = await this.db
      .select({ role: householdMembers.membershipRole })
      .from(householdMembers)
      .where(
        and(
          eq(householdMembers.householdId, input.householdId),
          eq(householdMembers.userId, actorUserId),
          eq(householdMembers.isActive, true),
          eq(householdMembers.membershipRole, "owner"),
        ),
      )
      .limit(1);

    if (!membership) {
      throw new Error("UNAUTHORIZED_HOUSEHOLD_POLICY_ACCESS");
    }

    const updateValues: Record<string, unknown> = {};
    if (input.maxDailyStories !== undefined) updateValues.maxDailyStories = input.maxDailyStories;
    if (input.contentBoundary !== undefined) updateValues.contentBoundary = input.contentBoundary;
    if (input.timeLimitMinutes !== undefined) updateValues.timeLimitMinutes = input.timeLimitMinutes;
    if (input.requireParentApprovalForAi !== undefined) updateValues.requireParentApprovalForAi = input.requireParentApprovalForAi;
    if (input.allowImageGeneration !== undefined) updateValues.allowImageGeneration = input.allowImageGeneration;
    if (input.allowTts !== undefined) updateValues.allowTts = input.allowTts;
    if (input.safetyMetadata !== undefined) updateValues.safetyMetadata = input.safetyMetadata;

    if (Object.keys(updateValues).length === 0) {
      throw new Error("No policy values to update");
    }

    const [record] = await this.db
      .insert(parentalSettings)
      .values(input)
      .onConflictDoUpdate({
        target: parentalSettings.householdId,
        set: updateValues,
      })
      .returning();
    if (!record) {
      throw new Error("Parental settings upsert returned no record");
    }
    return record;
  }

  async appendAuditEntry(input: NewPolicyAuditLogRecord): Promise<void> {
    await this.db.insert(policyAuditLog).values(input);
  }

  async getAuditTrail(
    householdId: string,
    actorUserId: string,
  ): Promise<PolicyAuditLogRecord[]> {
    return this.db
      .select({
        id: policyAuditLog.id,
        householdId: policyAuditLog.householdId,
        actorId: policyAuditLog.actorId,
        action: policyAuditLog.action,
        beforeState: policyAuditLog.beforeState,
        afterState: policyAuditLog.afterState,
        createdAt: policyAuditLog.createdAt,
      })
      .from(policyAuditLog)
      .innerJoin(
        householdMembers,
        and(
          eq(policyAuditLog.householdId, householdMembers.householdId),
          eq(householdMembers.userId, actorUserId),
          eq(householdMembers.isActive, true),
        ),
      )
      .where(eq(policyAuditLog.householdId, householdId))
      .orderBy(policyAuditLog.createdAt);
  }
}
