import { getPrivacyDb } from "./db";
import { DrizzleDataExportRepository } from "../db/repositories/drizzle/drizzle-data-export.repository";
import type { ChildExportPayload } from "../domain/export";
import { NotFoundError } from "../domain/errors";
import { appendLifecycleAudit } from "./lifecycle-audit.service";
import {
  findChildProfileForUser,
  getChildProfilePreferences,
  listCharactersByChildProfile,
} from "@lumi/profiles/application";
import { listSessionsForChildProfile } from "@lumi/story/application";

export interface ExportResult {
  id: string;
  householdId: string;
  childProfileId: string;
  exportFormat: string;
  status: string;
  payload: ChildExportPayload;
  createdAt: Date;
}

export async function exportChildData(
  userId: string,
  householdId: string,
  childProfileId: string,
): Promise<ExportResult> {
  const profile = await findChildProfileForUser(
    childProfileId,
    userId,
    householdId,
  );
  if (!profile) {
    throw new NotFoundError("ChildProfile", childProfileId);
  }

  const [preferences, characters, sessions] = await Promise.all([
    getChildProfilePreferences(childProfileId, userId, householdId),
    listCharactersByChildProfile(userId, householdId, childProfileId),
    listSessionsForChildProfile(householdId, childProfileId),
  ]);

  const payload: ChildExportPayload = {
    exportFormat: "lumi-child-v1",
    exportedAt: new Date().toISOString(),
    childProfile: {
      id: profile.id,
      displayName: profile.displayName,
      ageBand: profile.ageBand,
      locale: profile.locale,
      createdAt: profile.createdAt.toISOString(),
    },
    preferences: preferences
      ? {
          storyLength: preferences.storyLength,
          interactionLevel: preferences.interactionLevel,
          imageEnabled: preferences.imageEnabled,
          audioEnabled: preferences.audioEnabled,
        }
      : null,
    characters: characters.map((character) => ({
      id: character.id,
      name: character.name,
      broadKind: character.broadKind,
      characterType: character.characterType,
      originMode: character.originMode ?? null,
      originConcept: character.originConcept ?? null,
      createdAt: character.createdAt.toISOString(),
    })),
    storySessions: sessions.map((entry) => ({
      id: entry.session.id,
      status: entry.session.sessionStatus,
      startedAt: entry.session.startedAt?.toISOString() ?? null,
      completedAt: entry.session.completedAt?.toISOString() ?? null,
    })),
  };

  const repo = new DrizzleDataExportRepository(getPrivacyDb());
  const record = await repo.create({
    id: crypto.randomUUID(),
    householdId,
    childProfileId,
    requestedBy: userId,
    exportFormat: "lumi-child-v1",
    status: "generated",
    payload: payload as unknown as Record<string, unknown>,
  });

  await appendLifecycleAudit({
    householdId,
    actorId: userId,
    action: "export.generated",
    subjectType: "child_profile",
    subjectId: childProfileId,
    beforeState: {},
    afterState: {
      exportId: record.id,
      exportFormat: record.exportFormat,
      includes: ["profile", "preferences", "characters", "storySessions"],
    },
  });

  return {
    id: record.id,
    householdId: record.householdId,
    childProfileId: record.childProfileId,
    exportFormat: record.exportFormat,
    status: record.status,
    payload: record.payload as unknown as ChildExportPayload,
    createdAt: record.createdAt,
  };
}

export async function listExportsForChild(
  userId: string,
  householdId: string,
  childProfileId: string,
): Promise<ExportResult[]> {
  const profile = await findChildProfileForUser(
    childProfileId,
    userId,
    householdId,
  );
  if (!profile) {
    throw new NotFoundError("ChildProfile", childProfileId);
  }

  const repo = new DrizzleDataExportRepository(getPrivacyDb());
  const records = await repo.listByChildProfile(childProfileId, householdId);
  return records.map((record) => ({
    id: record.id,
    householdId: record.householdId,
    childProfileId: record.childProfileId,
    exportFormat: record.exportFormat,
    status: record.status,
    payload: record.payload as unknown as ChildExportPayload,
    createdAt: record.createdAt,
  }));
}
