import { and, asc, eq, isNull, or } from "drizzle-orm";

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
  type CharacterVisualDerivativePort,
  type CharacterVisualBagItem,
  type CharacterVisualEmotion,
  type CharacterVisualStoragePort,
  type GeneratedImageCandidate,
} from "./character-visual-generation";

export type GenerateCharacterVisualInput = {
  householdId: string;
  characterId: string;
  idempotencyKey: string;
  model?: string;
  candidateCount?: number;
  aspectRatio?: "1:1" | "4:3" | "3:2" | "16:9" | "4:5" | "2:3" | "9:16";
  mode?: "portrait" | "reference-sheet" | "expression-sheet";
  bagItems?: CharacterVisualBagItem[];
  emotionKeys?: CharacterVisualEmotion[];
};

export type PreviewCharacterVisualInput = Omit<
  GenerateCharacterVisualInput,
  "idempotencyKey"
> & { bagItems?: CharacterVisualBagItem[] };

export type CommitCharacterVisualPreviewInput = GenerateCharacterVisualInput & {
  preview: CharacterVisualPreview;
};

export type CharacterVisualServiceDeps = {
  generationPort: CharacterVisualGenerationPort;
  storagePort: CharacterVisualStoragePort;
  derivativePort?: CharacterVisualDerivativePort;
};

export type CharacterVisualPreview = {
  previewId: string;
  visualBriefVersion: string;
  visualBriefFingerprint: string;
  provider: string;
  model: string;
  providerRequestId?: string;
  candidates: GeneratedImageCandidate[];
  bagItems?: CharacterVisualBagItem[];
  emotionKeys?: CharacterVisualEmotion[];
  usageMetadata?: Record<string, unknown>;
  costMetadata?: Record<string, unknown>;
};

async function loadOwnedCharacterRecord(
  userId: string,
  householdId: string,
  characterId: string,
) {
  const summary = await getCharacterById(userId, householdId, characterId);
  if (!summary) throw new Error("CHARACTER_NOT_FOUND");

  const [record] = await getProfileDb()
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
    safetyBounds: record.safetyBounds as unknown as Record<string, unknown>,
    preferenceHints: (record.preferenceHints ?? {}) as Record<string, unknown>,
  });
}

async function getExistingJob(
  householdId: string,
  characterId: string,
  idempotencyKey: string,
) {
  const [job] = await getProfileDb()
    .select()
    .from(characterVisualGenerationJobs)
    .where(
      and(
        eq(characterVisualGenerationJobs.householdId, householdId),
        eq(characterVisualGenerationJobs.characterId, characterId),
        eq(characterVisualGenerationJobs.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);
  return job ?? null;
}

async function listJobCandidates(jobId: string) {
  return getProfileDb()
    .select()
    .from(characterVisualAssets)
    .where(eq(characterVisualAssets.generationJobId, jobId))
    .orderBy(asc(characterVisualAssets.candidateIndex));
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
        isNull(characterVisualAssets.deletedAt),
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

export async function previewCharacterVisualCandidates(
  userId: string,
  input: PreviewCharacterVisualInput,
  deps: Pick<CharacterVisualServiceDeps, "generationPort">,
): Promise<CharacterVisualPreview> {
  const character = await loadOwnedCharacterRecord(
    userId,
    input.householdId,
    input.characterId,
  );
  const brief = toBrief(character);
  const fingerprint = fingerprintCharacterVisualBrief(brief);
  const model = input.model ?? "krea/krea-2-medium-turbo";
  const candidateCount = Math.max(1, Math.min(input.candidateCount ?? 1, 4));
  const generated = await deps.generationPort.generate({
    jobId: `preview-${crypto.randomUUID()}`,
    brief,
    prompt: renderCharacterVisualPrompt(brief, input.mode, {
      ...(input.bagItems ? { bagItems: input.bagItems } : {}),
      ...(input.emotionKeys ? { emotions: input.emotionKeys } : {}),
    }),
    model,
    candidateCount,
    aspectRatio:
      input.aspectRatio ?? (input.mode === "reference-sheet" ? "3:2" : "1:1"),
    resolution: "1K",
  });

  if (generated.candidates.length === 0) {
    throw new Error("VISUAL_PROVIDER_RETURNED_NO_CANDIDATES");
  }

  return {
    previewId: crypto.randomUUID(),
    visualBriefVersion: brief.version,
    visualBriefFingerprint: fingerprint,
    provider: generated.provider,
    model: generated.model,
    ...(generated.providerRequestId
      ? { providerRequestId: generated.providerRequestId }
      : {}),
    candidates: generated.candidates,
    ...(input.bagItems?.length ? { bagItems: input.bagItems } : {}),
    ...(input.emotionKeys?.length ? { emotionKeys: input.emotionKeys } : {}),
    ...(generated.usageMetadata
      ? { usageMetadata: generated.usageMetadata }
      : {}),
    ...(generated.costMetadata ? { costMetadata: generated.costMetadata } : {}),
  };
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
  const existing = await getExistingJob(
    input.householdId,
    input.characterId,
    input.idempotencyKey,
  );
  if (existing) {
    return {
      job: existing,
      candidates: await listJobCandidates(existing.id),
      replayed: true,
    };
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
    const raced = await getExistingJob(
      input.householdId,
      input.characterId,
      input.idempotencyKey,
    );
    if (!raced) throw new Error("VISUAL_JOB_IDEMPOTENCY_RACE");
    return {
      job: raced,
      candidates: await listJobCandidates(raced.id),
      replayed: true,
    };
  }

  try {
    const generated = await deps.generationPort.generate({
      jobId,
      brief,
      prompt: renderCharacterVisualPrompt(brief, input.mode, {
        ...(input.bagItems ? { bagItems: input.bagItems } : {}),
        ...(input.emotionKeys ? { emotions: input.emotionKeys } : {}),
      }),
      model,
      candidateCount,
      aspectRatio:
        input.aspectRatio ?? (input.mode === "reference-sheet" ? "3:2" : "1:1"),
      resolution: "1K",
    });
    if (generated.candidates.length === 0) {
      throw new Error("VISUAL_PROVIDER_RETURNED_NO_CANDIDATES");
    }

    const persisted: Array<{
      candidate: GeneratedImageCandidate;
      stored: { storageRef: string };
      derivatives: Array<{
        variant: string;
        stored: { storageRef: string };
        mimeType: string;
        width: number;
        height: number;
        crop: Record<string, number>;
      }>;
    }> = [];
    for (const candidate of generated.candidates) {
      const stored = await deps.storagePort.store({
        householdId: input.householdId,
        characterId: input.characterId,
        jobId,
        candidateIndex: candidate.index,
        bytesBase64: candidate.bytesBase64,
        mimeType: candidate.mimeType,
      });
      const derivatives =
        input.mode === "expression-sheet" &&
        deps.derivativePort?.splitExpressionSheet
          ? await deps.derivativePort.splitExpressionSheet({
              bytesBase64: candidate.bytesBase64,
              mimeType: candidate.mimeType,
            })
          : input.mode === "reference-sheet" && deps.derivativePort
            ? await deps.derivativePort.splitReferenceSheet({
                bytesBase64: candidate.bytesBase64,
                mimeType: candidate.mimeType,
              })
            : [];
      const storedDerivatives = [];
      for (const derivative of derivatives) {
        const derivativeStored = await deps.storagePort.store({
          householdId: input.householdId,
          characterId: input.characterId,
          jobId,
          candidateIndex: candidate.index,
          bytesBase64: derivative.bytesBase64,
          mimeType: derivative.mimeType,
          variantKey: derivative.variant,
        });
        storedDerivatives.push({
          variant: derivative.variant,
          stored: derivativeStored,
          mimeType: derivative.mimeType,
          width: derivative.width,
          height: derivative.height,
          crop: derivative.crop,
        });
      }
      persisted.push({ candidate, stored, derivatives: storedDerivatives });
    }

    await db.transaction(async (tx) => {
      for (const { candidate, stored, derivatives } of persisted) {
        const sourceCompositeAssetId = crypto.randomUUID();
        await tx.insert(characterVisualAssets).values({
          id: sourceCompositeAssetId,
          householdId: input.householdId,
          characterId: input.characterId,
          generationJobId: jobId,
          storageRef: stored.storageRef,
          mimeType: candidate.mimeType,
          ...(typeof candidate.width === "number"
            ? { width: candidate.width }
            : {}),
          ...(typeof candidate.height === "number"
            ? { height: candidate.height }
            : {}),
          provider: generated.provider,
          model: generated.model,
          candidateIndex: candidate.index,
          assetKind:
            input.mode === "reference-sheet"
              ? "character_reference_sheet"
              : input.mode === "expression-sheet"
                ? "character_expression_sheet"
                : "character_portrait",
          lifecycleState: "candidate",
          provenance: {
            briefVersion: brief.version,
            briefFingerprint: fingerprint,
            providerRequestId: generated.providerRequestId ?? null,
            providerMetadata: candidate.providerMetadata ?? {},
            ...(input.emotionKeys?.length
              ? { emotionKeys: input.emotionKeys }
              : {}),
          },
        });
        for (const derivative of derivatives) {
          await tx.insert(characterVisualAssets).values({
            id: crypto.randomUUID(),
            householdId: input.householdId,
            characterId: input.characterId,
            generationJobId: jobId,
            assetKind: derivative.variant,
            storageRef: derivative.stored.storageRef,
            mimeType: derivative.mimeType,
            width: derivative.width,
            height: derivative.height,
            provider: generated.provider,
            model: generated.model,
            candidateIndex: candidate.index,
            lifecycleState: "candidate",
            sourceCompositeAssetId,
            cropMetadata: derivative.crop,
            provenance: {
              briefVersion: brief.version,
              briefFingerprint: fingerprint,
              sourceCompositeAssetId,
              derivation: "deterministic-seven-view-crop-v2",
              ...(input.emotionKeys?.length
                ? { emotionKeys: input.emotionKeys }
                : {}),
            },
          });
        }
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

  const job = await getExistingJob(
    input.householdId,
    input.characterId,
    input.idempotencyKey,
  );
  if (!job) throw new Error("VISUAL_JOB_NOT_FOUND_AFTER_GENERATION");
  return { job, candidates: await listJobCandidates(jobId), replayed: false };
}

export async function commitCharacterVisualPreview(
  userId: string,
  input: CommitCharacterVisualPreviewInput,
  deps: Omit<CharacterVisualServiceDeps, "generationPort">,
) {
  const character = await loadOwnedCharacterRecord(
    userId,
    input.householdId,
    input.characterId,
  );
  const db = getProfileDb();
  const existing = await getExistingJob(
    input.householdId,
    input.characterId,
    input.idempotencyKey,
  );
  if (existing) {
    return {
      job: existing,
      candidates: await listJobCandidates(existing.id),
      replayed: true,
    };
  }

  const brief = toBrief(character);
  const fingerprint = fingerprintCharacterVisualBrief(brief);
  if (
    input.preview.visualBriefVersion !== brief.version ||
    input.preview.visualBriefFingerprint !== fingerprint
  ) {
    throw new Error("VISUAL_PREVIEW_STALE");
  }

  const jobId = crypto.randomUUID();
  const candidateCount = Math.max(
    1,
    Math.min(input.preview.candidates.length, 4),
  );
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
      model: input.preview.model,
      requestedCandidateCount: candidateCount,
      status: "running",
    })
    .onConflictDoNothing()
    .returning();

  if (inserted.length === 0) {
    const raced = await getExistingJob(
      input.householdId,
      input.characterId,
      input.idempotencyKey,
    );
    if (!raced) throw new Error("VISUAL_JOB_IDEMPOTENCY_RACE");
    return {
      job: raced,
      candidates: await listJobCandidates(raced.id),
      replayed: true,
    };
  }

  try {
    const persisted: Array<{
      candidate: GeneratedImageCandidate;
      stored: { storageRef: string };
      derivatives: Array<{
        variant: string;
        stored: { storageRef: string };
        mimeType: string;
        width: number;
        height: number;
        crop: Record<string, number>;
      }>;
    }> = [];
    const compositeStorageRefsToDelete: string[] = [];

    for (const candidate of input.preview.candidates) {
      const stored = await deps.storagePort.store({
        householdId: input.householdId,
        characterId: input.characterId,
        jobId,
        candidateIndex: candidate.index,
        bytesBase64: candidate.bytesBase64,
        mimeType: candidate.mimeType,
      });
      const derivatives =
        input.mode === "expression-sheet" &&
        deps.derivativePort?.splitExpressionSheet
          ? await deps.derivativePort.splitExpressionSheet({
              bytesBase64: candidate.bytesBase64,
              mimeType: candidate.mimeType,
            })
          : input.mode === "reference-sheet" && deps.derivativePort
            ? await deps.derivativePort.splitReferenceSheet({
                bytesBase64: candidate.bytesBase64,
                mimeType: candidate.mimeType,
              })
            : [];
      const storedDerivatives = [];
      for (const derivative of derivatives) {
        const derivativeStored = await deps.storagePort.store({
          householdId: input.householdId,
          characterId: input.characterId,
          jobId,
          candidateIndex: candidate.index,
          bytesBase64: derivative.bytesBase64,
          mimeType: derivative.mimeType,
          variantKey: derivative.variant,
        });
        storedDerivatives.push({
          variant: derivative.variant,
          stored: derivativeStored,
          mimeType: derivative.mimeType,
          width: derivative.width,
          height: derivative.height,
          crop: derivative.crop,
        });
      }
      persisted.push({ candidate, stored, derivatives: storedDerivatives });
      if (
        (input.mode === "reference-sheet" ||
          input.mode === "expression-sheet") &&
        storedDerivatives.length > 0
      ) {
        compositeStorageRefsToDelete.push(stored.storageRef);
      }
    }

    await db.transaction(async (tx) => {
      for (const { candidate, stored, derivatives } of persisted) {
        const sourceCompositeAssetId = crypto.randomUUID();
        await tx.insert(characterVisualAssets).values({
          id: sourceCompositeAssetId,
          householdId: input.householdId,
          characterId: input.characterId,
          generationJobId: jobId,
          storageRef: stored.storageRef,
          mimeType: candidate.mimeType,
          ...(typeof candidate.width === "number"
            ? { width: candidate.width }
            : {}),
          ...(typeof candidate.height === "number"
            ? { height: candidate.height }
            : {}),
          provider: input.preview.provider,
          model: input.preview.model,
          candidateIndex: candidate.index,
          assetKind:
            input.mode === "reference-sheet"
              ? "character_reference_sheet"
              : input.mode === "expression-sheet"
                ? "character_expression_sheet"
                : "character_portrait",
          lifecycleState: "candidate",
          provenance: {
            briefVersion: brief.version,
            briefFingerprint: fingerprint,
            previewId: input.preview.previewId,
            providerRequestId: input.preview.providerRequestId ?? null,
            providerMetadata: candidate.providerMetadata ?? {},
            ...(input.bagItems?.length ? { bagItems: input.bagItems } : {}),
            ...(input.emotionKeys?.length
              ? { emotionKeys: input.emotionKeys }
              : {}),
          },
        });
        for (const derivative of derivatives) {
          await tx.insert(characterVisualAssets).values({
            id: crypto.randomUUID(),
            householdId: input.householdId,
            characterId: input.characterId,
            generationJobId: jobId,
            assetKind: derivative.variant,
            storageRef: derivative.stored.storageRef,
            mimeType: derivative.mimeType,
            width: derivative.width,
            height: derivative.height,
            provider: input.preview.provider,
            model: input.preview.model,
            candidateIndex: candidate.index,
            lifecycleState: "candidate",
            sourceCompositeAssetId,
            cropMetadata: derivative.crop,
            provenance: {
              briefVersion: brief.version,
              briefFingerprint: fingerprint,
              previewId: input.preview.previewId,
              sourceCompositeAssetId,
              derivation: "deterministic-seven-view-crop-v2",
              ...(input.bagItems?.length ? { bagItems: input.bagItems } : {}),
              ...(input.emotionKeys?.length
                ? { emotionKeys: input.emotionKeys }
                : {}),
            },
          });
        }
        if (
          (input.mode === "reference-sheet" ||
            input.mode === "expression-sheet") &&
          derivatives.length > 0
        ) {
          await tx
            .update(characterVisualAssets)
            .set({
              lifecycleState: "archived",
              deletedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(characterVisualAssets.id, sourceCompositeAssetId));
        }
      }
      await tx
        .update(characterVisualGenerationJobs)
        .set({
          status: "succeeded",
          provider: input.preview.provider,
          model: input.preview.model,
          ...(input.preview.providerRequestId
            ? { providerRequestId: input.preview.providerRequestId }
            : {}),
          ...(input.preview.usageMetadata
            ? { usageMetadata: input.preview.usageMetadata }
            : {}),
          ...(input.preview.costMetadata
            ? { costMetadata: input.preview.costMetadata }
            : {}),
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(characterVisualGenerationJobs.id, jobId));
    });
    if (deps.storagePort.delete) {
      await Promise.all(
        compositeStorageRefsToDelete.map((storageRef) =>
          deps.storagePort.delete!(storageRef),
        ),
      );
    }
  } catch (error) {
    await db
      .update(characterVisualGenerationJobs)
      .set({
        status: "failed",
        errorCode: "COMMIT_FAILED",
        errorMessage:
          error instanceof Error ? error.message.slice(0, 2000) : String(error),
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(characterVisualGenerationJobs.id, jobId));
    throw error;
  }

  const job = await getExistingJob(
    input.householdId,
    input.characterId,
    input.idempotencyKey,
  );
  if (!job) throw new Error("VISUAL_JOB_NOT_FOUND_AFTER_GENERATION");
  return { job, candidates: await listJobCandidates(jobId), replayed: false };
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
  if (asset.sourceCompositeAssetId) {
    throw new Error("VISUAL_DERIVATIVE_NOT_SELECTABLE");
  }

  const current = await getCharacterVisualCanon(
    userId,
    householdId,
    characterId,
  );
  if (current?.selectedAssetId === assetId) return current;

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
    if (current?.selectedAssetId) {
      await tx
        .update(characterVisualAssets)
        .set({
          lifecycleState: "archived",
          archivedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          or(
            eq(characterVisualAssets.id, current.selectedAssetId),
            eq(
              characterVisualAssets.sourceCompositeAssetId,
              current.selectedAssetId,
            ),
          ),
        );
    }

    await tx
      .update(characterVisualAssets)
      .set({
        lifecycleState: "canonical",
        rejectedAt: null,
        archivedAt: null,
        updatedAt: new Date(),
      })
      .where(
        or(
          eq(characterVisualAssets.id, assetId),
          eq(characterVisualAssets.sourceCompositeAssetId, assetId),
        ),
      );

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

export async function selectCharacterVisualRepresentation(
  userId: string,
  householdId: string,
  characterId: string,
  role: "full_body" | "half_body",
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
        isNull(characterVisualAssets.deletedAt),
      ),
    )
    .limit(1);
  if (!asset || asset.lifecycleState === "rejected") {
    throw new Error("VISUAL_ASSET_NOT_SELECTABLE");
  }
  const validKind =
    role === "full_body"
      ? asset.assetKind.startsWith("body-")
      : asset.assetKind.startsWith("head-");
  if (!validKind) throw new Error("VISUAL_ASSET_ROLE_MISMATCH");

  const current = await getCharacterVisualCanon(
    userId,
    householdId,
    characterId,
  );
  const field =
    role === "full_body"
      ? "selectedFullBodyAssetId"
      : "selectedHalfBodyAssetId";
  if (current?.[field] === assetId) return current;

  if (current) {
    await db
      .update(characterVisualCanons)
      .set({ [field]: assetId, updatedAt: new Date() })
      .where(eq(characterVisualCanons.id, current.id));
  } else {
    const brief = asset.generationJobId
      ? await db
          .select()
          .from(characterVisualGenerationJobs)
          .where(eq(characterVisualGenerationJobs.id, asset.generationJobId))
          .limit(1)
      : [];
    const job = brief[0];
    if (!job) throw new Error("VISUAL_JOB_NOT_FOUND");
    const visualBrief = job.visualBrief as unknown as CharacterVisualBrief;
    await db.insert(characterVisualCanons).values({
      id: crypto.randomUUID(),
      householdId,
      characterId,
      [field]: assetId,
      visualBriefVersion: job.visualBriefVersion,
      visualBriefFingerprint: job.visualBriefFingerprint,
      appearanceTraits: visualBrief.appearanceAnchors,
      styleProfile: visualBrief.artDirection,
      safetyConstraints: visualBrief.safetyConstraints,
      status: "selected",
      selectedAt: new Date(),
    });
  }
  return getCharacterVisualCanon(userId, householdId, characterId);
}

export async function selectCharacterVisualHeaderAsset(
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
        isNull(characterVisualAssets.deletedAt),
      ),
    )
    .limit(1);
  if (!asset || asset.lifecycleState === "rejected") {
    throw new Error("VISUAL_ASSET_NOT_SELECTABLE");
  }
  const validKind =
    asset.assetKind.startsWith("head-") ||
    asset.assetKind.startsWith("expression-");
  if (!validKind) throw new Error("VISUAL_HEADER_ASSET_ROLE_MISMATCH");

  const current = await getCharacterVisualCanon(
    userId,
    householdId,
    characterId,
  );
  if (current?.selectedHeaderAssetId === assetId) return current;

  if (current) {
    await db
      .update(characterVisualCanons)
      .set({ selectedHeaderAssetId: assetId, updatedAt: new Date() })
      .where(eq(characterVisualCanons.id, current.id));
  } else {
    const [job] = asset.generationJobId
      ? await db
          .select()
          .from(characterVisualGenerationJobs)
          .where(eq(characterVisualGenerationJobs.id, asset.generationJobId))
          .limit(1)
      : [];
    if (!job) throw new Error("VISUAL_JOB_NOT_FOUND");
    const visualBrief = job.visualBrief as unknown as CharacterVisualBrief;
    await db.insert(characterVisualCanons).values({
      id: crypto.randomUUID(),
      householdId,
      characterId,
      selectedHeaderAssetId: assetId,
      visualBriefVersion: job.visualBriefVersion,
      visualBriefFingerprint: job.visualBriefFingerprint,
      appearanceTraits: visualBrief.appearanceAnchors,
      styleProfile: visualBrief.artDirection,
      safetyConstraints: visualBrief.safetyConstraints,
      status: "selected",
      selectedAt: new Date(),
    });
  }
  return getCharacterVisualCanon(userId, householdId, characterId);
}

export async function rejectCharacterVisualCandidate(
  userId: string,
  householdId: string,
  characterId: string,
  assetId: string,
) {
  await loadOwnedCharacterRecord(userId, householdId, characterId);
  const current = await getCharacterVisualCanon(
    userId,
    householdId,
    characterId,
  );
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
        or(
          eq(characterVisualAssets.id, assetId),
          eq(characterVisualAssets.sourceCompositeAssetId, assetId),
        ),
        eq(characterVisualAssets.householdId, householdId),
        eq(characterVisualAssets.characterId, characterId),
      ),
    )
    .returning();
  if (updated.length === 0) throw new Error("VISUAL_ASSET_NOT_FOUND");
  return updated[0];
}

export async function deleteCharacterVisualVariant(
  userId: string,
  householdId: string,
  characterId: string,
  assetId: string,
) {
  await loadOwnedCharacterRecord(userId, householdId, characterId);
  const [asset] = await getProfileDb()
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
  if (!asset) throw new Error("VISUAL_ASSET_NOT_FOUND");
  const currentCanon = await getCharacterVisualCanon(
    userId,
    householdId,
    characterId,
  );
  if (currentCanon?.selectedAssetId === assetId) {
    throw new Error("CANNOT_DELETE_ACTIVE_CANON");
  }
  if (asset.deletedAt) return asset;

  const updated = await getProfileDb()
    .update(characterVisualAssets)
    .set({
      lifecycleState: "archived",
      deletedAt: new Date(),
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
