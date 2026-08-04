import { createHash } from "node:crypto";

import type { StoredAsset } from "../domain/asset";
import { CostLimitExceededError } from "../domain/errors";
import { computeMediaFingerprint } from "../domain/fingerprint";
import type {
  ConsistencyFinding,
  SafetyFinding,
} from "../domain/findings";
import type { CharacterVisualIdentity } from "../domain/identity";
import type { ImageJobRequest, MediaJobResult } from "../domain/media-jobs";
import type {
  FingerprintCachePort,
  MediaAssetRepositoryPort,
  MediaConsistencyValidatorPort,
  MediaCostEstimatePort,
  MediaPolicyPort,
  MediaProvider,
  MediaSafetyValidatorPort,
  ObjectStoragePort,
} from "../ports";

export interface ImagePipelineDeps {
  provider: MediaProvider;
  storage: ObjectStoragePort;
  repository: MediaAssetRepositoryPort;
  cache: FingerprintCachePort;
  safety: MediaSafetyValidatorPort;
  consistency: MediaConsistencyValidatorPort;
  costEstimator: MediaCostEstimatePort;
  policy: MediaPolicyPort;
}

export type ImagePipelineResult =
  | { ok: true; asset: StoredAsset; result: MediaJobResult }
  | { ok: false; result: MediaJobResult };

function identityKey(identity: CharacterVisualIdentity | undefined): string {
  if (!identity) return "none";
  return `${identity.characterId}:${identity.referenceKey}:${identity.traitHashes.join(",")}`;
}

export class ImagePipeline {
  constructor(private readonly deps: ImagePipelineDeps) {}

  private buildFingerprint(job: ImageJobRequest): string {
    return computeMediaFingerprint({
      kind: "image",
      assetType: job.assetType,
      scope: job.scope,
      identity: identityKey(job.identity),
      policyKey: `${job.sizePolicy.label}:${job.sizePolicy.quality}`,
      contentKey: job.contentKey,
    });
  }

  async run(job: ImageJobRequest): Promise<ImagePipelineResult> {
    const fingerprint = this.buildFingerprint(job);

    const cached = await this.deps.cache.get(fingerprint, job.scope);
    if (cached) {
      return {
        ok: true,
        asset: cached,
        result: {
          requestId: job.requestId,
          kind: "image",
          status: "stored",
          fingerprint,
          assetId: cached.id,
          estimatedCostUsd: 0,
          actualCostUsd: 0,
          attempts: 0,
          safetyFindings: [],
          consistencyFindings: [],
        },
      };
    }

    const estimatedCostUsd = this.deps.costEstimator.estimateImage(
      job.sizePolicy,
      job.modelPolicy,
    );

    try {
      this.deps.policy.checkImage(
        job.sizePolicy,
        job.modelPolicy,
        estimatedCostUsd,
      );
    } catch (error) {
      return {
        ok: false,
        result: this.failureResult(
          job,
          fingerprint,
          estimatedCostUsd,
          error instanceof CostLimitExceededError
            ? "cost_limit_exceeded"
            : "policy_blocked",
        ),
      };
    }

    const safetyFindings: SafetyFinding[] = [
      ...this.deps.safety.validatePrompt(job.prompt),
    ];

    if (safetyFindings.some((f) => f.severity === "error")) {
      return {
        ok: false,
        result: this.failureResult(
          job,
          fingerprint,
          estimatedCostUsd,
          "safety_rejected",
          safetyFindings,
        ),
      };
    }

    let providerImage;
    try {
      providerImage = await this.deps.provider.generateImage({
        requestId: job.requestId,
        prompt: job.prompt,
        identity: job.identity,
        width: job.sizePolicy.width,
        height: job.sizePolicy.height,
        quality: job.sizePolicy.quality,
        timeoutMs: job.modelPolicy.timeoutMs,
        seed: job.seed,
      });
    } catch {
      return {
        ok: false,
        result: this.failureResult(
          job,
          fingerprint,
          estimatedCostUsd,
          "provider_unavailable",
          safetyFindings,
        ),
      };
    }

    safetyFindings.push(...this.deps.safety.validateImage(providerImage.bytes));

    if (safetyFindings.some((f) => f.severity === "error")) {
      return {
        ok: false,
        result: this.failureResult(
          job,
          fingerprint,
          estimatedCostUsd,
          "safety_rejected",
          safetyFindings,
        ),
      };
    }

    let consistencyFindings: ConsistencyFinding[] = [];
    if (job.identity) {
      consistencyFindings =
        this.deps.consistency.validateImageAgainstIdentity(
          job.identity,
          providerImage.bytes,
        );
      if (consistencyFindings.some((f) => f.severity === "error")) {
        return {
          ok: false,
          result: this.failureResult(
            job,
            fingerprint,
            estimatedCostUsd,
            "consistency_rejected",
            safetyFindings,
            consistencyFindings,
          ),
        };
      }
    }

    const storageKey = `media/${job.scope.householdId}/${job.scope.childProfileId}/image/${job.assetType}/${fingerprint}.${extname(providerImage.mimeType)}`;

    try {
      await this.deps.storage.put(
        storageKey,
        providerImage.bytes,
        providerImage.mimeType,
      );
    } catch {
      return {
        ok: false,
        result: this.failureResult(
          job,
          fingerprint,
          estimatedCostUsd,
          "storage_failed",
          safetyFindings,
          consistencyFindings,
        ),
      };
    }

    const asset: StoredAsset = {
      id: crypto.randomUUID(),
      kind: "image",
      assetType: job.assetType,
      mimeType: providerImage.mimeType,
      storageProvider: this.deps.storage.providerId,
      storageKey,
      checksum: createHash("sha256").update(providerImage.bytes).digest("hex"),
      byteSize: providerImage.bytes.byteLength,
      width: providerImage.width,
      height: providerImage.height,
      lifecycleStatus: "active",
      scope: job.scope,
      fingerprint,
      createdAt: new Date(),
    };

    const stored = await this.deps.repository.createAsset(asset);
    await this.deps.cache.put(fingerprint, job.scope, stored);

    return {
      ok: true,
      asset: stored,
      result: {
        requestId: job.requestId,
        kind: "image",
        status: "stored",
        fingerprint,
        assetId: stored.id,
        estimatedCostUsd,
        actualCostUsd: estimatedCostUsd,
        attempts: 1,
        providerId: this.deps.provider.providerId,
        modelId: job.modelPolicy.modelId,
        safetyFindings,
        consistencyFindings,
      },
    };
  }

  private failureResult(
    job: ImageJobRequest,
    fingerprint: string,
    estimatedCostUsd: number,
    failureState: MediaJobResult["failureState"],
    safetyFindings: SafetyFinding[] = [],
    consistencyFindings: ConsistencyFinding[] = [],
  ): MediaJobResult {
    return {
      requestId: job.requestId,
      kind: "image",
      status: "failed",
      fingerprint,
      estimatedCostUsd,
      actualCostUsd: 0,
      attempts: 1,
      safetyFindings,
      consistencyFindings,
      failureState,
    };
  }
}

function extname(mimeType: string): string {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  if (mimeType.includes("webp")) return "webp";
  return "bin";
}
