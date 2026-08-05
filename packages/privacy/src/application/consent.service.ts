import { getPrivacyDb } from "./db";
import { DrizzleConsentRepository } from "../db/repositories/drizzle/drizzle-consent.repository";
import {
  assertConsentType,
  grantConsent,
  revokeConsent,
  type ConsentState,
  type ConsentType,
} from "../domain/consent";
import { AuthorizationError, NotFoundError } from "../domain/errors";
import { appendLifecycleAudit } from "./lifecycle-audit.service";
import { listChildProfiles } from "@lumi/profiles/application";

export interface ConsentResult {
  id: string;
  householdId: string;
  childProfileId: string | null;
  consentType: string;
  status: "granted" | "revoked";
  grantedAt: Date;
  revokedAt: Date | null;
  grantedBy: string;
}

export interface GrantConsentInput {
  householdId: string;
  childProfileId?: string;
  consentType: string;
}

function toConsentResult(record: {
  id: string;
  householdId: string;
  childProfileId: string | null;
  consentType: string;
  status: string;
  grantedAt: Date;
  revokedAt: Date | null;
  grantedBy: string;
}): ConsentResult {
  return {
    id: record.id,
    householdId: record.householdId,
    childProfileId: record.childProfileId,
    consentType: record.consentType,
    status: record.status as ConsentResult["status"],
    grantedAt: record.grantedAt,
    revokedAt: record.revokedAt,
    grantedBy: record.grantedBy,
  };
}

async function assertHouseholdAccess(
  householdId: string,
  userId: string,
): Promise<void> {
  await listChildProfiles(userId, householdId);
}

async function assertChildInHousehold(
  userId: string,
  householdId: string,
  childProfileId: string,
): Promise<void> {
  const profiles = await listChildProfiles(userId, householdId);
  const found = profiles.some((p) => p.id === childProfileId);
  if (!found) {
    throw new AuthorizationError("Child profile is not part of this household");
  }
}

export async function listConsents(
  userId: string,
  householdId: string,
): Promise<ConsentResult[]> {
  await assertHouseholdAccess(householdId, userId);

  const repo = new DrizzleConsentRepository(getPrivacyDb());
  const records = await repo.findByHousehold(householdId);
  return records.map(toConsentResult);
}

export async function listConsentsForChild(
  userId: string,
  householdId: string,
  childProfileId: string,
): Promise<ConsentResult[]> {
  await assertHouseholdAccess(householdId, userId);
  await assertChildInHousehold(userId, householdId, childProfileId);

  const repo = new DrizzleConsentRepository(getPrivacyDb());
  const records = await repo.findByChildProfile(childProfileId);
  return records.map(toConsentResult);
}

export async function grantConsentForHousehold(
  userId: string,
  input: GrantConsentInput,
): Promise<ConsentResult> {
  await assertHouseholdAccess(input.householdId, userId);
  if (input.childProfileId) {
    await assertChildInHousehold(
      userId,
      input.householdId,
      input.childProfileId,
    );
  }
  const consentType = assertConsentType(input.consentType);

  const repo = new DrizzleConsentRepository(getPrivacyDb());
  const state = grantConsent({
    id: crypto.randomUUID(),
    householdId: input.householdId,
    childProfileId: input.childProfileId ?? null,
    consentType,
    grantedAt: new Date(),
    grantedBy: userId,
  });

  const record = await repo.create({
    id: state.id,
    householdId: state.householdId,
    childProfileId: state.childProfileId,
    consentType: state.consentType,
    status: state.status,
    grantedAt: state.grantedAt,
    revokedAt: null,
    grantedBy: state.grantedBy,
  });

  await appendLifecycleAudit({
    householdId: input.householdId,
    actorId: userId,
    action: "consent.grant",
    subjectType: "child_profile",
    subjectId: input.childProfileId ?? input.householdId,
    beforeState: {},
    afterState: { consentType, childProfileId: input.childProfileId ?? null },
  });

  return toConsentResult(record);
}

export async function revokeConsentForHousehold(
  userId: string,
  householdId: string,
  consentId: string,
): Promise<ConsentResult> {
  await assertHouseholdAccess(householdId, userId);

  const repo = new DrizzleConsentRepository(getPrivacyDb());
  const existing = await repo.findById(consentId);
  if (!existing || existing.householdId !== householdId) {
    throw new NotFoundError("ConsentRecord", consentId);
  }

  const state = revokeConsent(
    {
      ...(existing as ConsentState),
      consentType: existing.consentType as ConsentType,
    },
    new Date(),
  );

  const record = await repo.updateStatus(
    consentId,
    state.status,
    state.revokedAt,
  );
  if (!record) {
    throw new NotFoundError("ConsentRecord", consentId);
  }

  await appendLifecycleAudit({
    householdId,
    actorId: userId,
    action: "consent.revoke",
    subjectType: "child_profile",
    subjectId: existing.childProfileId ?? householdId,
    beforeState: { consentType: existing.consentType },
    afterState: { consentType: existing.consentType, revoked: true },
  });

  return toConsentResult(record);
}
