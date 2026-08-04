import { describe, expect, it } from "vitest";

import { AudioPipeline } from "../../src/application/audio-pipeline.service";
import { MediaCostEstimator } from "../../src/application/cost-estimator.service";
import { MediaPolicyEnforcer } from "../../src/application/policy-enforcer.service";
import type { AudioJobRequest } from "../../src/domain/media-jobs";
import {
  FakeMediaProvider,
  InMemoryFingerprintCache,
  InMemoryMediaAssetRepository,
  InMemoryObjectStorage,
  StaticSafetyValidator,
} from "../../src/infrastructure";
import type { MediaPolicyConfig } from "../../src/application/policy-enforcer.service";
import { AUDIO_MODEL, AUDIO_POLICY, SCOPE } from "../fixtures/media.fixtures";

const LIMITS: MediaPolicyConfig = {
  maxImageCostUsd: 0.1,
  maxAudioCostUsd: 0.2,
  maxImageBytes: 10 * 1024 * 1024,
  maxAudioBytes: 5 * 1024 * 1024,
  maxImageAttempts: 3,
  maxAudioAttempts: 3,
};

function makeAmbient(
  overrides: Partial<AudioJobRequest> = {},
): AudioJobRequest {
  return {
    requestId: "req:ambient-1",
    scope: SCOPE,
    assetType: "ambience",
    tags: ["forest", "birds"],
    durationPolicy: AUDIO_POLICY,
    modelPolicy: AUDIO_MODEL,
    seed: "seed-ambient",
    contentKey: "ambient-forest-1",
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

describe("AudioPipeline (ambience/SFX)", () => {
  it("stores generated ambience with fake provider", async () => {
    const { provider, pipeline } = buildPipeline(new FakeMediaProvider());
    const outcome = await pipeline.run({ kind: "tags", job: makeAmbient() });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.asset.assetType).toBe("ambience");
    expect(outcome.result.status).toBe("stored");
    expect(provider.audioCallsSnapshot[0]?.requestedTags).toEqual([
      "forest",
      "birds",
    ]);
  });

  it("is idempotent for same tags", async () => {
    const { provider, pipeline } = buildPipeline(new FakeMediaProvider());
    const first = await pipeline.run({ kind: "tags", job: makeAmbient() });
    expect(first.ok).toBe(true);
    const second = await pipeline.run({ kind: "tags", job: makeAmbient() });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(provider.audioCallsSnapshot).toHaveLength(1);
    expect(first.ok ? second.asset.id === first.asset.id : false).toBe(true);
  });

  it("produces different fingerprint for different tags", async () => {
    const { provider, pipeline } = buildPipeline(new FakeMediaProvider());
    const forest = await pipeline.run({ kind: "tags", job: makeAmbient() });
    expect(forest.ok).toBe(true);
    const ocean = await pipeline.run({
      kind: "tags",
      job: makeAmbient({
        requestId: "req:ambient-2",
        tags: ["ocean", "waves"],
        contentKey: "ambient-ocean-1",
      }),
    });
    expect(ocean.ok).toBe(true);
    if (!forest.ok || !ocean.ok) return;
    expect(ocean.result.fingerprint).not.toBe(forest.result.fingerprint);
    expect(provider.audioCallsSnapshot).toHaveLength(2);
  });
});
