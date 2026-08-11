import { createHash } from "node:crypto";

import { and, asc, eq } from "drizzle-orm";

import {
  imageGenerationCostEvents,
  imageGenerationJobs,
  managedAssets,
} from "../db/schema/profile";
import { getProfileDb } from "./db";
import {
  planImageGeneration,
  selectImageGenerationCapability,
  type GeneratedImage,
  type GridLayout,
  type ImageAspectRatio,
  type ImageGenerationBudgetPolicy,
  type ImageGenerationModelCapabilities,
  type ImageGenerationPlan,
  type ImageGenerationProviderPort,
  type ImageResolution,
} from "./image-generation-platform";
import {
  registerManagedAssetMetadata,
  type ManagedAssetAuthorizationPort,
  type ManagedAssetScope,
} from "./managed-asset.service";

export type ImageGenerationBinaryStorageInput = ManagedAssetScope & {
  assetKind: string;
  jobId: string;
  candidateIndex: number;
  bytesBase64: string;
  mimeType: string;
};

export interface ImageGenerationBinaryStoragePort {
  store(
    input: ImageGenerationBinaryStorageInput,
  ): Promise<{ storageRef: string }>;
  delete?(storageRef: string): Promise<void>;
}

export interface ImageGridSplitterPort {
  split(input: {
    composite: GeneratedImage;
    layout: GridLayout;
  }): Promise<GeneratedImage[]>;
}

export type GenerateManagedImageCandidatesInput = ManagedAssetScope & {
  assetKind: string;
  idempotencyKey: string;
  prompt: string;
  candidateCount: number;
  aspectRatio?: ImageAspectRatio;
  resolution?: ImageResolution;
  requestMaxCostUsd: number;
  preferredProvider?: string;
  preferredModel?: string;
  allowGrid?: boolean;
  liveTest?: boolean;
};

export type ImageGenerationServiceDeps = {
  authorizationPort: ManagedAssetAuthorizationPort;
  providers: readonly ImageGenerationProviderPort[];
  storagePort: ImageGenerationBinaryStoragePort;
  budgetPolicy: ImageGenerationBudgetPolicy;
  gridSplitter?: ImageGridSplitterPort;
};

function fingerprintPrompt(prompt: string): string {
  return createHash("sha256").update(prompt.trim()).digest("hex");
}

function assertInput(input: GenerateManagedImageCandidatesInput) {
  if (!input.assetKind.trim() || input.assetKind.length > 64) {
    throw new Error("IMAGE_GENERATION_ASSET_KIND_INVALID");
  }
  if (!input.idempotencyKey.trim() || input.idempotencyKey.length > 160) {
    throw new Error("IMAGE_GENERATION_IDEMPOTENCY_KEY_INVALID");
  }
  if (!input.prompt.trim()) throw new Error("IMAGE_GENERATION_PROMPT_REQUIRED");
}

function allCapabilities(
  providers: readonly ImageGenerationProviderPort[],
): readonly ImageGenerationModelCapabilities[] {
  return providers.flatMap((provider) => [...provider.capabilities]);
}

function providerForPlan(
  providers: readonly ImageGenerationProviderPort[],
  plan: ImageGenerationPlan,
) {
  const provider = providers.find((candidate) =>
    candidate.capabilities.some(
      (capability) =>
        capability.provider === plan.provider &&
        capability.model === plan.model,
    ),
  );
  if (!provider) throw new Error("IMAGE_GENERATION_PROVIDER_NOT_FOUND");
  return provider;
}

async function getExistingJob(input: GenerateManagedImageCandidatesInput) {
  const [job] = await getProfileDb()
    .select()
    .from(imageGenerationJobs)
    .where(
      and(
        eq(imageGenerationJobs.householdId, input.householdId),
        eq(imageGenerationJobs.subjectType, input.subjectType),
        eq(imageGenerationJobs.subjectId, input.subjectId),
        eq(imageGenerationJobs.assetKind, input.assetKind),
        eq(imageGenerationJobs.idempotencyKey, input.idempotencyKey),
      ),
    )
    .limit(1);
  return job ?? null;
}

async function listJobManagedAssets(jobId: string) {
  return getProfileDb()
    .select()
    .from(managedAssets)
    .where(
      and(
        eq(managedAssets.sourceSystem, "image_generation"),
        eq(managedAssets.sourceAssetId, jobId),
      ),
    )
    .orderBy(asc(managedAssets.createdAt), asc(managedAssets.id));
}

async function cleanStoredObjects(
  storagePort: ImageGenerationBinaryStoragePort,
  refs: readonly string[],
) {
  if (!storagePort.delete) return;
  await Promise.allSettled(
    refs.map((storageRef) => storagePort.delete!(storageRef)),
  );
}

function planForInput(
  input: GenerateManagedImageCandidatesInput,
  deps: ImageGenerationServiceDeps,
) {
  const planInput = {
    candidateCount: input.candidateCount,
    aspectRatio: input.aspectRatio ?? ("1:1" as const),
    resolution: input.resolution ?? ("1K" as const),
    requestMaxCostUsd: input.requestMaxCostUsd,
    liveTest: input.liveTest ?? false,
    // Grid execution is fail-closed until a deterministic binary splitter is composed.
    allowGrid: Boolean(input.allowGrid && deps.gridSplitter),
  };
  return selectImageGenerationCapability(
    allCapabilities(deps.providers),
    planInput,
    deps.budgetPolicy,
    {
      ...(input.preferredProvider ? { provider: input.preferredProvider } : {}),
      ...(input.preferredModel ? { model: input.preferredModel } : {}),
    },
  );
}

async function normalizeProviderImages(
  plan: ImageGenerationPlan,
  images: GeneratedImage[],
  splitter?: ImageGridSplitterPort,
) {
  if (plan.strategy !== "grid") {
    if (images.length !== plan.candidateCount) {
      throw new Error("IMAGE_GENERATION_PROVIDER_CANDIDATE_COUNT_MISMATCH");
    }
    return images;
  }
  if (!plan.grid || !splitter)
    throw new Error("IMAGE_GENERATION_GRID_SPLITTER_REQUIRED");
  if (images.length !== 1)
    throw new Error("IMAGE_GENERATION_GRID_COMPOSITE_COUNT_INVALID");
  const split = await splitter.split({
    composite: images[0]!,
    layout: plan.grid,
  });
  if (split.length !== plan.candidateCount) {
    throw new Error("IMAGE_GENERATION_GRID_SPLIT_COUNT_MISMATCH");
  }
  return split.map((image, index) => ({ ...image, index }));
}

export async function generateManagedImageCandidates(
  userId: string,
  input: GenerateManagedImageCandidatesInput,
  deps: ImageGenerationServiceDeps,
) {
  assertInput(input);
  await deps.authorizationPort.assertCanManage({
    userId,
    householdId: input.householdId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
  });

  const existing = await getExistingJob(input);
  if (existing) {
    return {
      job: existing,
      candidates: await listJobManagedAssets(existing.id),
      replayed: true,
    };
  }

  // Capability selection + cost planning happen before any provider invocation.
  const selected = planForInput(input, deps);
  const plan = selected.plan;
  if (!Number.isFinite(plan.estimatedCostUsd)) {
    throw new Error("IMAGE_GENERATION_ESTIMATED_COST_REQUIRED");
  }

  const db = getProfileDb();
  const jobId = crypto.randomUUID();
  const inserted = await db
    .insert(imageGenerationJobs)
    .values({
      id: jobId,
      householdId: input.householdId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      assetKind: input.assetKind,
      idempotencyKey: input.idempotencyKey,
      promptFingerprint: fingerprintPrompt(input.prompt),
      requestedCandidateCount: input.candidateCount,
      strategy: plan.strategy,
      provider: plan.provider,
      model: plan.model,
      aspectRatio: input.aspectRatio ?? "1:1",
      resolution: input.resolution ?? "1K",
      providerRequestCount: plan.providerRequestCount,
      estimatedCostUsd: plan.estimatedCostUsd.toFixed(6),
      budgetCapUsd: plan.budgetCapUsd.toFixed(6),
      pricingBasis: plan.pricingBasis,
      status: "planned",
      usageMetadata: {},
      costMetadata: {},
      planMetadata: {
        strategy: plan.strategy,
        providerRequestCount: plan.providerRequestCount,
        imagesPerProviderRequest: plan.imagesPerProviderRequest,
        directEstimatedCostUsd: plan.directEstimatedCostUsd,
        ...(plan.grid ? { grid: plan.grid } : {}),
      },
    })
    .onConflictDoNothing()
    .returning();

  if (inserted.length === 0) {
    const raced = await getExistingJob(input);
    if (!raced) throw new Error("IMAGE_GENERATION_IDEMPOTENCY_RACE");
    return {
      job: raced,
      candidates: await listJobManagedAssets(raced.id),
      replayed: true,
    };
  }

  await db.insert(imageGenerationCostEvents).values({
    id: crypto.randomUUID(),
    householdId: input.householdId,
    generationJobId: jobId,
    eventType: "estimated",
    amountUsd: plan.estimatedCostUsd.toFixed(6),
    provider: plan.provider,
    model: plan.model,
    pricingBasis: plan.pricingBasis,
    metadata: { budgetCapUsd: plan.budgetCapUsd, strategy: plan.strategy },
  });

  const storedRefs: string[] = [];
  try {
    await db
      .update(imageGenerationJobs)
      .set({ status: "running", updatedAt: new Date() })
      .where(eq(imageGenerationJobs.id, jobId));

    const provider = providerForPlan(deps.providers, plan);
    const generated = await provider.generate({
      jobId,
      prompt: input.prompt,
      model: plan.model,
      candidateCount: input.candidateCount,
      aspectRatio: input.aspectRatio ?? "1:1",
      resolution: input.resolution ?? "1K",
      strategy: plan.strategy,
      ...(plan.grid ? { grid: plan.grid } : {}),
    });
    if (
      generated.provider !== plan.provider ||
      generated.model !== plan.model
    ) {
      throw new Error("IMAGE_GENERATION_PROVIDER_IDENTITY_MISMATCH");
    }
    const candidates = await normalizeProviderImages(
      plan,
      generated.images,
      deps.gridSplitter,
    );

    for (const candidate of candidates) {
      const stored = await deps.storagePort.store({
        householdId: input.householdId,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        assetKind: input.assetKind,
        jobId,
        candidateIndex: candidate.index,
        bytesBase64: candidate.bytesBase64,
        mimeType: candidate.mimeType,
      });
      storedRefs.push(stored.storageRef);

      await registerManagedAssetMetadata(
        userId,
        {
          householdId: input.householdId,
          subjectType: input.subjectType,
          subjectId: input.subjectId,
          assetKind: input.assetKind,
          storageRef: stored.storageRef,
          mimeType: candidate.mimeType,
          width: candidate.width ?? null,
          height: candidate.height ?? null,
          provider: generated.provider,
          model: generated.model,
          originType: "generated",
          sourceSystem: "image_generation",
          sourceRecordId: crypto.randomUUID(),
          sourceAssetId: jobId,
          provenance: {
            generationJobId: jobId,
            promptFingerprint: fingerprintPrompt(input.prompt),
            providerRequestId: generated.providerRequestId ?? null,
            candidateIndex: candidate.index,
            strategy: plan.strategy,
            providerMetadata: candidate.providerMetadata ?? {},
          },
          metadata: {
            estimatedCostUsd: plan.estimatedCostUsd,
            ...(typeof generated.actualCostUsd === "number"
              ? { actualJobCostUsd: generated.actualCostUsd }
              : {}),
          },
        },
        { authorizationPort: deps.authorizationPort },
      );
    }

    const actualCostUsd = generated.actualCostUsd ?? plan.estimatedCostUsd;
    await db.transaction(async (tx) => {
      await tx
        .update(imageGenerationJobs)
        .set({
          status: "succeeded",
          actualCostUsd: actualCostUsd.toFixed(6),
          ...(generated.providerRequestId
            ? { providerRequestId: generated.providerRequestId }
            : {}),
          usageMetadata: generated.usageMetadata ?? {},
          costMetadata: generated.costMetadata ?? {},
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(imageGenerationJobs.id, jobId));

      await tx.insert(imageGenerationCostEvents).values({
        id: crypto.randomUUID(),
        householdId: input.householdId,
        generationJobId: jobId,
        eventType: "actual",
        amountUsd: actualCostUsd.toFixed(6),
        provider: generated.provider,
        model: generated.model,
        pricingBasis: plan.pricingBasis,
        metadata: generated.costMetadata ?? {},
      });
    });
  } catch (error) {
    await cleanStoredObjects(deps.storagePort, storedRefs);
    await db
      .update(imageGenerationJobs)
      .set({
        status: "failed",
        errorCode: "GENERATION_FAILED",
        errorMessage:
          error instanceof Error ? error.message.slice(0, 2000) : String(error),
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(imageGenerationJobs.id, jobId));
    throw error;
  }

  const job = await getExistingJob(input);
  if (!job) throw new Error("IMAGE_GENERATION_JOB_NOT_FOUND_AFTER_SUCCESS");
  return {
    job,
    candidates: await listJobManagedAssets(jobId),
    replayed: false,
  };
}

export async function listImageGenerationCostEvents(
  householdId: string,
  jobId: string,
) {
  return getProfileDb()
    .select()
    .from(imageGenerationCostEvents)
    .where(
      and(
        eq(imageGenerationCostEvents.householdId, householdId),
        eq(imageGenerationCostEvents.generationJobId, jobId),
      ),
    )
    .orderBy(asc(imageGenerationCostEvents.createdAt));
}

export function planManagedImageGenerationForTesting(
  capability: ImageGenerationModelCapabilities,
  input: Parameters<typeof planImageGeneration>[1],
  policy: ImageGenerationBudgetPolicy,
) {
  return planImageGeneration(capability, input, policy);
}
