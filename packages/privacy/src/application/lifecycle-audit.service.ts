import { getPrivacyDb } from "./db";
import { DrizzleDataLifecycleAuditRepository } from "../db/repositories/drizzle/drizzle-data-lifecycle-audit.repository";
import { listChildProfiles } from "@lumi/profiles/application";

export interface LifecycleAuditEntry {
  id: string;
  householdId: string;
  actorId: string;
  action: string;
  subjectType: string;
  subjectId: string;
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  createdAt: Date;
}

function getRepo() {
  const db = getPrivacyDb();
  return new DrizzleDataLifecycleAuditRepository(db);
}

export async function appendLifecycleAudit(input: {
  householdId: string;
  actorId: string;
  action: string;
  subjectType: string;
  subjectId: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
}): Promise<void> {
  const repo = getRepo();
  await repo.append({
    id: crypto.randomUUID(),
    householdId: input.householdId,
    actorId: input.actorId,
    action: input.action,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    beforeState: input.beforeState ?? {},
    afterState: input.afterState ?? {},
  });
}

export async function getLifecycleAuditTrail(
  householdId: string,
  userId: string,
): Promise<LifecycleAuditEntry[]> {
  await listChildProfiles(userId, householdId);

  const repo = getRepo();
  const entries = await repo.listByHousehold(householdId);
  return entries.map((entry) => ({
    id: entry.id,
    householdId: entry.householdId,
    actorId: entry.actorId,
    action: entry.action,
    subjectType: entry.subjectType,
    subjectId: entry.subjectId,
    beforeState: entry.beforeState,
    afterState: entry.afterState,
    createdAt: entry.createdAt,
  }));
}
