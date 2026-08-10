import { and, asc, eq } from "drizzle-orm";

import {
  characterVisualAssets,
  characterVisualCanons,
  characterVisualGenerationJobs,
  lumiCharacters,
} from "../db/schema/profile";
import { getProfileDb } from "./db";
import { getCharacterById } from "./character-bootstrap.service";
import {
  buildCharacterVisualBrief,
  fingerprintCharacterVisualBrief,
  type CharacterVisualBrief,
} from "./character-visual-brief";
import {
  renderCharacterVisualPrompt,
  type CharacterVisualGenerationPort,
  type CharacterVisualStoragePort,
} from "./character-visual-generation";

export type GenerateCharacterVisualInput = {
  householdId: string;
  characterId: string;
  idempotencyKey: string;
  model?: string;
  candidateCount?: number;
  aspectRatio?: "1:1" | "4:3" | "3:2" | "16:9" | "4:5" | "2:3" | "9:16";
};

export type CharacterVisualServiceDeps = {
  generationPort: CharacterVisualGenerationPort;
  storagePort: CharacterVisualStoragePort;
};

async function loadOwnedCharacterRecord(
  userId: string,
  householdId: string,
  characterId: string,
) {
  const summary = await getCharacterById(userId, householdId, characterId);
  if (!summary) throw new Error("CHARACTER_NOT_FOUND");

  const db = getProfileDb();
  const [record] = await db
    .select()
    .from(lumiCharacters)
    .where(
      and(
        eq(lumiCharacters.id, characterId),
        eq(lumiCharacters.householdId, householdId),
      ),
    )
    .limit(1);
  if (!record) throw new Error("CHARACTER_NOT_FOUND");
  return record;
}

function toBrief(record: Awaited<ReturnType<typeof loadOwnedCharacterRecord>>) {
  return buildCharacterVisualBrief({
    characterId: record.id,
    householdId: record.householdId,
    name: record.name,
    broadKind: record.broadKind,
    characterType: record.characterType,
    subtype: record.subtype,
    originConcept: record.originConcept,
    startingRegionArchetype: record.startingRegionArchetype,
    startingLocation: record.startingLocation,
    homeArchetype: record.homeArchetype,
    lifecycleStage: record.lifecycleStage,
    safetyBounds: record.safetyBounds as Record<string, unknown>,
    preferenceHints: (record.preferenceHints ?? {}) as Record<string, unknown>,
  });
}

export async function listCharacterVisualCandidates(
  userId: string,
  householdId: string,
  characterId: string,
) {
  await loadOwnedCharacterRecord(userId, householdId, characterId);
  return getProfileDb()
    .select()
    .from(characterVisualAssets)
    .where(
      and(
        eq(characterVisualAssets.householdId, householdId),
        eq(characterVisualAssets.characterId, characterId),
      ),
    )
    .orderBy(
      asc(characterVisualAssets.createdAt),
      asc(characterVisualAssets.candidateIndex),
    );
}

export async function getCharacterVisualCanon(
  userId: string,
  householdId: string,
  characterId: string,
) {
  await loadOwnedCharacterRecord(userId, householdId, characterId);
  const [canon] = await getProfileDb()
    .select()
    .from(characterVisualCanons)
    .where(
      and(
        eq(characterVisualCanons.householdId, householdId),
        eq(characterVisualCanons.characterId, characterId),
      ),
    )
    .limit(1);
  return canon ?? null;
}

async function getExistingJob(householdId: string, idempotencyKey: string) {
  const [job] = await getProfileDb()
    .select()
    .from(characterVisualGenerationJobs)
    .where(
      and(
        eq(characterVisualGenerationJobs.householdId, householdId),
        eq(characterVisualGenerationJobs.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);
  return job ?? null;
}

export async function generateCharacterVisualCandidates(
  userId: string,
  input: GenerateCharacterVisualInput,
  deps: CharacterVisualServiceDeps,
) {
  const character = await loadOwnedCharacterRecord(
    userId,
    input.householdId,
    input.characterId,
  );
  const db = getProfileDb();
  const existing = await getExistingJob(input.householdId, input.idempotencyKey);
  if (existing) {
    const candidates = await db
      .select()
      .from(characterVisualAssets)
      .where(eq(characterVisualAssets.generationJobId, existing.id))
      .orderBy(asc(characterVisualAssets.candidateIndex));
    return { job: existing, candidates, replayed: true };
  }

  const brief = toBrief(character);
  const fingerprint = fingerprintCharacterVisualBrief(brief);
  const jobId = crypto.randomUUID();
  const model = input.model ?? "krea/krea-2-medium-turbo";
  const candidateCount = Math.max(1, Math.min(input.candidateCount ?? 1, 4));

  const inserted = await db
    .insert(characterVisualGenerationJobs)
    .values({
      id: jobId,
      householdId: input.householdId,
      characterId: input.characterId,
      idempotencyKey: input.idempotencyKey,
      visualBriefVersion: brief.version,
      visualBriefFingerprint: fingerprint,
      visualBrief: brief as unknown as Record<string, unknown>,
      model,
      requestedCandidateCount: candidateCount,
      status: "running",
    })
    .onConflictDoNothing()
    .returning();

  if (inserted.length === 0) {
    const raced = await getExistingJob(input.householdId, input.idempotencyKey);
    if (!raced) throw new Error("VISUAL_JOB_IDEMPOTENCY_RACE");
    const candidates = await db
      .select()
      .from(characterVisualAssets)
      .where(eq(characterVisualAssets.generationJobId, raced.id))
      .orderBy(asc(characterVisualAssets.candidateIndex));
    return { job: raced, candidates, replayed: true };
  }

  try {
    const generated = await deps.generationPort.generate({
      jobId,
      brief,
      prompt: renderCharacterVisualPrompt(brief),
      model,
      candidateCount,
      aspectRatio: input.aspectRatio ?? "1:1",
      resolution: "1K",
    });

    if (generated.candidates.length === 0) {
      throw new Error("VISUAL_PROVIDER_RETURNED_NO_CANDIDATES");
    }

    const persisted = [];
    for (const candidate of generated.candidates) {
      const stored = await deps.storagePort.store({
        householdId: input.householdId,
        characterId: input.characterId,
        jobId,
        candidateIndex: candidate.index,
        bytesBase64: candidate.bytesBase64,
        mimeType: candidate.mimeType,
      });
      persisted.push({ candidate, stored });
    }

    await db.transaction(async (tx) => {
      for (const { candidate, stored } of persisted) {
        await tx.insert(characterVisualAssets).values({
          id: crypto.randomUUID(),
          householdId: input.householdId,
          characterId: input.characterId,
          generationJobId: jobId,
          storageRef: stored.storageRef,
          mimeType: candidate.mimeType,
          ...(typeof candidate.width === "number" ? { width: candidate.width } : {}),
          ...(typeof candidate.height === "number" ? { height: candidate.height } : {}),
          provider: generated.provider,
          model: generated.model,
          candidateIndex: candidate.index,
          lifecycleState: "candidate",
          provenance: {
            briefVersion: brief.version,
            briefFingerprint: fingerprint,
            providerRequestId: generated.providerRequestId ?? null,
            providerMetadata: candidate.providerMetadata ?? {},
          },
        });
      }

      await tx
        .update(characterVisualGenerationJobs)
        .set({
          status: "succeeded",
          provider: generated.provider,
          model: generated.model,
          ...(generated.providerRequestId
            ? { providerRequestId: generated.providerRequestId }
            : {}),
          ...(generated.usageMetadata
            ? { usageMetadata: generated.usageMetadata }
            : {}),
          ...(generated.costMetadata
            ? { costMetadata: generated.costMetadata }
            : {}),
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(characterVisualGenerationJobs.id, jobId));
    });
  } catch (error) {
    await db
      .update(characterVisualGenerationJobs)
      .set({
        status: "failed",
        errorCode: "GENERATION_FAILED",
        errorMessage:
          error instanceof Error ? error.message.slice(0, 2000) : String(error),
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(characterVisualGenerationJobs.id, jobId));
    throw error;
  }

  const job = await getExistingJob(input.householdId, input.idempotencyKey);
  const candidates = await db
    .select()
    .from(characterVisualAssets)
    .where(eq(characterVisualAssets.generationJobId, jobId))
    .orderBy(asc(characterVisualAssets.candidateIndex));
  return { job: job!, candidates, replayed: false };
}

export async function selectCharacterVisualCanon(
  userId: string,
  householdId: string,
  characterId: string,
  assetId: string,
) {
  await loadOwnedCharacterRecord(userId, householdId, characterId);
  const db = getProfileDb();
  const [asset] = await db
    .select()
    .from(characterVisualAssets)
    .where(
      and(
        eq(characterVisualAssets.id, assetId),
        eq(characterVisualAssets.householdId, householdId),
        eq(characterVisualAssets.characterId, characterId),
      ),
    )
    .limit(1);
  if (!asset || asset.lifecycleState === "rejected") {
    throw new Error("VISUAL_ASSET_NOT_SELECTABLE");
  }

  const [job] = asset.generationJobId
    ? await db
        .select()
        .from(characterVisualGenerationJobs)
        .where(eq(characterVisualGenerationJobs.id, asset.generationJobId))
        .limit(1)
    : [];
  if (!job) throw new Error("VISUAL_JOB_NOT_FOUND");
  const brief = job.visualBrief as unknown as CharacterVisualBrief;

  await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(characterVisualCanons)
      .where(eq(characterVisualCanons.characterId, characterId))
      .limit(1);

    if (current?.selectedAssetId && current.selectedAssetId !== assetId) {
      await tx
        .update(characterVisualAssets)
        .set({
          lifecycleState: "archived",
          archivedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(characterVisualAssets.id, current.selectedAssetId));
    }

    await tx
      .update(characterVisualAssets)
      .set({
        lifecycleState: "canonical",
        rejectedAt: null,
        archivedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(characterVisualAssets.id, assetId));

    if (current) {
      await tx
        .update(characterVisualCanons)
        .set({
          selectedAssetId: assetId,
          visualBriefVersion: job.visualBriefVersion,
          visualBriefFingerprint: job.visualBriefFingerprint,
          appearanceTraits: brief.appearanceAnchors,
          styleProfile: brief.artDirection,
          safetyConstraints: brief.safetyConstraints,
          status: "selected",
          selectedAt: new Date(),
          version: current.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(characterVisualCanons.id, current.id));
    } else {
      await tx.insert(characterVisualCanons).values({
        id: crypto.randomUUID(),
        householdId,
        characterId,
        selectedAssetId: assetId,
        visualBriefVersion: job.visualBriefVersion,
        visualBriefFingerprint: job.visualBriefFingerprint,
        appearanceTraits: brief.appearanceAnchors,
        styleProfile: brief.artDirection,
        safetyConstraints: brief.safetyConstraints,
        status: "selected",
        selectedAt: new Date(),
      });
    }
  });

  return getCharacterVisualCanon(userId, householdId, characterId);
}

export async function rejectCharacterVisualCandidate(
  userId: string,
  householdId: string,
  characterId: string,
  assetId: string,
) {
  await loadOwnedCharacterRecord(userId, householdId, characterId);
  const current = await getCharacterVisualCanon(userId, householdId, characterId);
  if (current?.selectedAssetId === assetId) {
    throw new Error("CANNOT_REJECT_ACTIVE_CANON");
  }

  const updated = await getProfileDb()
    .update(characterVisualAssets)
    .set({
      lifecycleState: "rejected",
      rejectedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(characterVisualAssets.id, assetId),
        eq(characterVisualAssets.householdId, householdId),
        eq(characterVisualAssets.characterId, characterId),
      ),
    )
    .returning();
  if (updated.length === 0) throw new Error("VISUAL_ASSET_NOT_FOUND");
  return updated[0];
}
