import { getProfileDb } from "./db";
import { DrizzleParentPolicyRepository } from "../db/repositories/drizzle/drizzle-parent-policy.repository";
import type { NewParentalSettingRecord } from "../db/schema/profile/parental-settings";
import type { ParentalSettingRecord } from "../db/schema/profile/parental-settings";

export interface PolicyResult {
  householdId: string;
  maxDailyStories: number;
  contentBoundary: string;
  timeLimitMinutes: number | null;
  requireParentApprovalForAi: boolean;
  allowImageGeneration: boolean;
  allowTts: boolean;
  blockedTopics: string[];
  customNotes: string[];
}

export interface UpdatePolicyInput {
  maxDailyStories?: number;
  contentBoundary?: string;
  timeLimitMinutes?: number | null;
  requireParentApprovalForAi?: boolean;
  allowImageGeneration?: boolean;
  allowTts?: boolean;
  blockedTopics?: string[];
  customNotes?: string[];
}

function toPolicyResult(record: ParentalSettingRecord): PolicyResult {
  return {
    householdId: record.householdId,
    maxDailyStories: record.maxDailyStories,
    contentBoundary: record.contentBoundary,
    timeLimitMinutes: record.timeLimitMinutes,
    requireParentApprovalForAi: record.requireParentApprovalForAi,
    allowImageGeneration: record.allowImageGeneration,
    allowTts: record.allowTts,
    blockedTopics: record.safetyMetadata?.blockedTopics ?? [],
    customNotes: record.safetyMetadata?.customNotes ?? [],
  };
}

function getRepo() {
  const db = getProfileDb();
  return new DrizzleParentPolicyRepository(db);
}

export async function getPolicy(
  householdId: string,
  userId: string,
): Promise<PolicyResult | null> {
  const repo = getRepo();
  const record = await repo.findByHousehold(householdId, userId);
  if (!record) return null;

  return toPolicyResult(record);
}

export async function updatePolicy(
  householdId: string,
  userId: string,
  input: UpdatePolicyInput,
): Promise<PolicyResult> {
  const repo = getRepo();

  const current = await repo.findByHousehold(householdId, userId);
  const priorMetadata = current?.safetyMetadata ?? {};

  const inputMetadata =
    input.blockedTopics !== undefined || input.customNotes !== undefined
      ? {
          blockedTopics:
            input.blockedTopics ?? priorMetadata.blockedTopics ?? [],
          customNotes: input.customNotes ?? priorMetadata.customNotes ?? [],
        }
      : undefined;

  const update: Partial<NewParentalSettingRecord> = {};
  if (input.maxDailyStories !== undefined)
    update.maxDailyStories = input.maxDailyStories;
  if (input.contentBoundary !== undefined)
    update.contentBoundary = input.contentBoundary;
  if (input.timeLimitMinutes !== undefined)
    update.timeLimitMinutes = input.timeLimitMinutes;
  if (input.requireParentApprovalForAi !== undefined)
    update.requireParentApprovalForAi = input.requireParentApprovalForAi;
  if (input.allowImageGeneration !== undefined)
    update.allowImageGeneration = input.allowImageGeneration;
  if (input.allowTts !== undefined) update.allowTts = input.allowTts;
  if (inputMetadata !== undefined) update.safetyMetadata = inputMetadata;

  const record = await repo.upsert(
    {
      householdId,
      maxDailyStories: update.maxDailyStories,
      contentBoundary: update.contentBoundary,
      timeLimitMinutes: update.timeLimitMinutes,
      requireParentApprovalForAi: update.requireParentApprovalForAi,
      allowImageGeneration: update.allowImageGeneration,
      allowTts: update.allowTts,
      safetyMetadata: update.safetyMetadata,
    },
    userId,
  );

  await repo.appendAuditEntry({
    id: crypto.randomUUID(),
    householdId,
    actorId: userId,
    action: "policy.update",
    beforeState: current ? { ...toPolicyResult(current) } : {},
    afterState: { ...toPolicyResult(record) },
  });

  return toPolicyResult(record);
}

export async function appendPolicyAudit(
  householdId: string,
  actorId: string,
  action: string,
  beforeState: Record<string, unknown>,
  afterState: Record<string, unknown>,
): Promise<void> {
  const repo = getRepo();
  await repo.appendAuditEntry({
    id: crypto.randomUUID(),
    householdId,
    actorId,
    action,
    beforeState,
    afterState,
  });
}

export interface PolicyAuditEntryResult {
  id: string;
  householdId: string;
  actorId: string;
  action: string;
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  createdAt: Date;
}

export async function getPolicyAuditTrail(
  householdId: string,
  userId: string,
): Promise<PolicyAuditEntryResult[]> {
  const repo = getRepo();
  const entries = await repo.getAuditTrail(householdId, userId);
  return entries.map((entry) => ({
    id: entry.id,
    householdId: entry.householdId,
    actorId: entry.actorId,
    action: entry.action,
    beforeState: entry.beforeState,
    afterState: entry.afterState,
    createdAt: entry.createdAt,
  }));
}
