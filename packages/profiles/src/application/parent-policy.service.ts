import { getProfileDb } from "./db";
import { DrizzleParentPolicyRepository } from "../db/repositories/drizzle/drizzle-parent-policy.repository";

export interface PolicyResult {
  householdId: string;
  maxDailyStories: number;
  contentBoundary: string;
  timeLimitMinutes: number | null;
  requireParentApprovalForAi: boolean;
  allowImageGeneration: boolean;
  allowTts: boolean;
}

export interface UpdatePolicyInput {
  maxDailyStories?: number;
  contentBoundary?: string;
  timeLimitMinutes?: number | null;
  requireParentApprovalForAi?: boolean;
  allowImageGeneration?: boolean;
  allowTts?: boolean;
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

  return {
    householdId: record.householdId,
    maxDailyStories: record.maxDailyStories,
    contentBoundary: record.contentBoundary,
    timeLimitMinutes: record.timeLimitMinutes,
    requireParentApprovalForAi: record.requireParentApprovalForAi,
    allowImageGeneration: record.allowImageGeneration,
    allowTts: record.allowTts,
  };
}

export async function updatePolicy(
  householdId: string,
  userId: string,
  input: UpdatePolicyInput,
): Promise<PolicyResult> {
  const repo = getRepo();
  const record = await repo.upsert({ householdId, ...input }, userId);

  return {
    householdId: record.householdId,
    maxDailyStories: record.maxDailyStories,
    contentBoundary: record.contentBoundary,
    timeLimitMinutes: record.timeLimitMinutes,
    requireParentApprovalForAi: record.requireParentApprovalForAi,
    allowImageGeneration: record.allowImageGeneration,
    allowTts: record.allowTts,
  };
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
