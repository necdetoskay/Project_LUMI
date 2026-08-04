import { createHash } from "node:crypto";

import type { StoredAsset } from "../domain/asset";
import { CostLimitExceededError } from "../domain/errors";
import { computeMediaFingerprint } from "../domain/fingerprint";
import type { SafetyFinding } from "../domain/findings";
import type {
  AudioJobRequest,
  MediaJobResult,
  TtsJobRequest,
} from "../domain/media-jobs";
import type {
  FingerprintCachePort,
  MediaAssetRepositoryPort,
  MediaCostEstimatePort,
  MediaPolicyPort,
  MediaProvider,
  MediaSafetyValidatorPort,
  ObjectStoragePort,
} from "../ports";

export interface AudioPipelineDeps {
  provider: MediaProvider;
  storage: ObjectStoragePort;
  repository: MediaAssetRepositoryPort;
  cache: FingerprintCachePort;
  safety: MediaSafetyValidatorPort;
  costEstimator: MediaCostEstimatePort;
  policy: MediaPolicyPort;
}

export type AudioJobInput =
  | { kind: "tts"; job: TtsJobRequest }
  | { kind: "tags"; job: AudioJobRequest };

export type AudioPipelineResult =
  | { ok: true; asset: StoredAsset; result: MediaJobResult }
  | { ok: false; result: MediaJobResult };

export class AudioPipeline {
  constructor(private readonly deps: AudioPipelineDeps) {}

  private buildFingerprint(input: AudioJobInput): string {
    if (input.kind === "tts") {
      return computeMediaFingerprint({
        kind: "audio",
        assetType: input.job.assetType,
        scope: input.job.scope,
        identity: input.job.voice.providerKey,
        policyKey: `tts:${input.job.voice.voiceId}`,
        contentKey: input.job.contentKey,
      });
    }
    return computeMediaFingerprint({
      kind: "audio",
      assetType: input.job.assetType,
      scope: input.job.scope,
      policyKey: `tags:${[...input.job.tags].sort().join(",")}`,
      contentKey: input.job.contentKey,
    });
  }

  async run(input: AudioJobInput): Promise<AudioPipelineResult> {
    const fingerprint = this.buildFingerprint(input);
    const job = input.job;

    const cached = await this.deps.cache.get(fingerprint, job.scope);
    if (cached) {
      return {
        ok: true,
        asset: cached,
        result: {
          requestId: job.requestId,
          kind: "audio",
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

    const estimatedCostUsd = this.deps.costEstimator.estimateAudio(
      job.durationPolicy,
      job.modelPolicy,
    );

    try {
      this.deps.policy.checkAudio(
        job.durationPolicy,
        job.modelPolicy,
        estimatedCostUsd,
      );
    } catch (error) {
      return {
        ok: false,
        result: this.failureResult(
          input,
          fingerprint,
          estimatedCostUsd,
          error instanceof CostLimitExceededError
            ? "cost_limit_exceeded"
            : "policy_blocked",
        ),
      };
    }

    const safetyFindings: SafetyFinding[] =
      input.kind === "tts"
        ? this.deps.safety.validatePrompt(input.job.text)
        : this.deps.safety.validatePrompt(input.job.tags.join(" "));

    if (safetyFindings.some((f) => f.severity === "error")) {
      return {
        ok: false,
        result: this.failureResult(
          input,
          fingerprint,
          estimatedCostUsd,
          "safety_rejected",
          safetyFindings,
        ),
      };
    }

    let providerAudio;
    try {
      providerAudio =
        input.kind === "tts"
          ? await this.deps.provider.synthesizeSpeech({
              requestId: job.requestId,
              text: input.job.text,
              voice: input.job.voice,
              maxSeconds: job.durationPolicy.maxSeconds,
              timeoutMs: job.modelPolicy.timeoutMs,
              seed: job.seed,
            })
          : await this.deps.provider.generateAmbient({
              requestId: job.requestId,
              tags: input.job.tags,
              maxSeconds: job.durationPolicy.maxSeconds,
              timeoutMs: job.modelPolicy.timeoutMs,
              seed: job.seed,
            });
    } catch {
      return {
        ok: false,
        result: this.failureResult(
          input,
          fingerprint,
          estimatedCostUsd,
          "provider_unavailable",
          safetyFindings,
        ),
      };
    }

    safetyFindings.push(...this.deps.safety.validateAudio(providerAudio.bytes));

    if (safetyFindings.some((f) => f.severity === "error")) {
      return {
        ok: false,
        result: this.failureResult(
          input,
          fingerprint,
          estimatedCostUsd,
          "safety_rejected",
          safetyFindings,
        ),
      };
    }

    const storageKey = `media/${job.scope.householdId}/${job.scope.childProfileId}/audio/${job.assetType}/${fingerprint}.${extname(providerAudio.mimeType)}`;

    try {
      await this.deps.storage.put(
        storageKey,
        providerAudio.bytes,
        providerAudio.mimeType,
      );
    } catch {
      return {
        ok: false,
        result: this.failureResult(
          input,
          fingerprint,
          estimatedCostUsd,
          "storage_failed",
          safetyFindings,
        ),
      };
    }

    const asset: StoredAsset = {
      id: crypto.randomUUID(),
      kind: "audio",
      assetType: job.assetType,
      mimeType: providerAudio.mimeType,
      storageProvider: this.deps.storage.providerId,
      storageKey,
      checksum: createHash("sha256").update(providerAudio.bytes).digest("hex"),
      byteSize: providerAudio.bytes.byteLength,
      durationSeconds: providerAudio.durationSeconds,
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
        kind: "audio",
        status: "stored",
        fingerprint,
        assetId: stored.id,
        estimatedCostUsd,
        actualCostUsd: estimatedCostUsd,
        attempts: 1,
        providerId: this.deps.provider.providerId,
        modelId: job.modelPolicy.modelId,
        safetyFindings,
        consistencyFindings: [],
      },
    };
  }

  private failureResult(
    input: AudioJobInput,
    fingerprint: string,
    estimatedCostUsd: number,
    failureState: MediaJobResult["failureState"],
    safetyFindings: SafetyFinding[] = [],
  ): MediaJobResult {
    return {
      requestId: input.job.requestId,
      kind: "audio",
      status: "failed",
      fingerprint,
      estimatedCostUsd,
      actualCostUsd: 0,
      attempts: 1,
      safetyFindings,
      consistencyFindings: [],
      failureState,
    };
  }
}

function extname(mimeType: string): string {
  if (mimeType.includes("mp3")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mpeg") || mimeType.includes("mp4")) return "mp4";
  return "bin";
}
