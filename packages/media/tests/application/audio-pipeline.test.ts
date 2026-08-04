import { describe, expect, it } from "vitest";

import { AudioPipeline } from "../../src/application/audio-pipeline.service";
import { MediaCostEstimator } from "../../src/application/cost-estimator.service";
import { MediaPolicyEnforcer } from "../../src/application/policy-enforcer.service";
import type { TtsJobRequest } from "../../src/domain/media-jobs";
import {
  FakeMediaProvider,
  InMemoryFingerprintCache,
  InMemoryMediaAssetRepository,
  InMemoryObjectStorage,
  StaticSafetyValidator,
} from "../../src/infrastructure";
import type { MediaPolicyConfig } from "../../src/application/policy-enforcer.service";
import {
  AUDIO_MODEL,
  AUDIO_POLICY,
  SCOPE,
  VOICE,
} from "../fixtures/media.fixtures";

const LIMITS: MediaPolicyConfig = {
  maxImageCostUsd: 0.1,
  maxAudioCostUsd: 0.2,
  maxImageBytes: 10 * 1024 * 1024,
  maxAudioBytes: 5 * 1024 * 1024,
  maxImageAttempts: 3,
  maxAudioAttempts: 3,
};

function makeTts(overrides: Partial<TtsJobRequest> = {}): TtsJobRequest {
  return {
    requestId: "req:tts-1",
    scope: SCOPE,
    assetType: "narration",
    text: "The little bear wandered through the meadow.",
    voice: VOICE,
    durationPolicy: AUDIO_POLICY,
    modelPolicy: AUDIO_MODEL,
    seed: "seed-tts",
    contentKey: "narration-1",
    ...overrides,
  };
}

function buildPipeline(provider = new FakeMediaProvider()) {
  const storage = new InMemoryObjectStorage();
  const repository = new InMemoryMediaAssetRepository();
  const cache = new InMemoryFingerprintCache();
  const pipeline = new AudioPipeline({
    provider,
    storage,
    repository,
    cache,
    safety: new StaticSafetyValidator(),
    costEstimator: new MediaCostEstimator(),
    policy: new MediaPolicyEnforcer(LIMITS),
  });
  return { provider, storage, repository, cache, pipeline };
}

describe("AudioPipeline (TTS)", () => {
  it("stores synthesized narration with fake provider", async () => {
    const { provider, pipeline } = buildPipeline(new FakeMediaProvider());
    const outcome = await pipeline.run({ kind: "tts", job: makeTts() });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.asset.kind).toBe("audio");
    expect(outcome.asset.assetType).toBe("narration");
    expect(outcome.result.status).toBe("stored");
    expect(outcome.asset.durationSeconds).toBeGreaterThan(0);
    expect(provider.audioCallsSnapshot).toHaveLength(1);
    expect(provider.audioCallsSnapshot[0]?.requestedText).toBe(
      "The little bear wandered through the meadow.",
    );
  });

  it("serves cache hit without re-calling the provider", async () => {
    const { provider, pipeline } = buildPipeline(new FakeMediaProvider());
    const first = await pipeline.run({ kind: "tts", job: makeTts() });
    expect(first.ok).toBe(true);
    const second = await pipeline.run({ kind: "tts", job: makeTts() });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(first.ok ? second.asset.id === first.asset.id : false).toBe(true);
    expect(provider.audioCallsSnapshot).toHaveLength(1);
  });

  it("blocks before provider call when cost limit exceeded", async () => {
    const provider = new FakeMediaProvider();
    const { pipeline } = buildPipeline(provider);
    const outcome = await pipeline.run({
      kind: "tts",
      job: makeTts({
        durationPolicy: {
          ...AUDIO_POLICY,
          maxSeconds: 3600,
          maxBytes: 10 * 1024 * 1024,
        },
      }),
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.result.failureState).toBe("cost_limit_exceeded");
    expect(provider.audioCallsSnapshot).toHaveLength(0);
  });

  it("rejects on safety failure", async () => {
    const { pipeline, storage } = buildPipeline(new FakeMediaProvider());
    const outcome = await pipeline.run({
      kind: "tts",
      job: makeTts({ text: "a scary scream in the dark" }),
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.result.failureState).toBe("safety_rejected");
    expect(storage.size()).toBe(0);
  });
});
