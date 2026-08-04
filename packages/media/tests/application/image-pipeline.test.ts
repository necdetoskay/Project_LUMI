import { describe, expect, it } from "vitest";

import { ImagePipeline } from "../../src/application/image-pipeline.service";
import { MediaCostEstimator } from "../../src/application/cost-estimator.service";
import { MediaPolicyEnforcer } from "../../src/application/policy-enforcer.service";
import type { ImageJobRequest } from "../../src/domain/media-jobs";
import {
  FakeMediaProvider,
  InMemoryFingerprintCache,
  InMemoryMediaAssetRepository,
  InMemoryObjectStorage,
  StaticConsistencyValidator,
  StaticSafetyValidator,
} from "../../src/infrastructure";
import type { MediaPolicyConfig } from "../../src/application/policy-enforcer.service";
import {
  IDENTITY,
  IMAGE_MODEL,
  IMAGE_POLICY,
  SCOPE,
} from "../fixtures/media.fixtures";

const LIMITS: MediaPolicyConfig = {
  maxImageCostUsd: 0.1,
  maxAudioCostUsd: 0.2,
  maxImageBytes: 10 * 1024 * 1024,
  maxAudioBytes: 5 * 1024 * 1024,
  maxImageAttempts: 3,
  maxAudioAttempts: 3,
};

function makeJob(overrides: Partial<ImageJobRequest> = {}): ImageJobRequest {
  return {
    requestId: "req:image-1",
    scope: SCOPE,
    assetType: "scene",
    prompt: "a cheerful meadow with flowers",
    identity: IDENTITY,
    sizePolicy: IMAGE_POLICY,
    modelPolicy: IMAGE_MODEL,
    seed: "seed-1",
    contentKey: "scene-1",
    ...overrides,
  };
}

function buildPipeline(provider = new FakeMediaProvider()) {
  const storage = new InMemoryObjectStorage();
  const repository = new InMemoryMediaAssetRepository();
  const cache = new InMemoryFingerprintCache();
  const pipeline = new ImagePipeline({
    provider,
    storage,
    repository,
    cache,
    safety: new StaticSafetyValidator(),
    consistency: new StaticConsistencyValidator(),
    costEstimator: new MediaCostEstimator(),
    policy: new MediaPolicyEnforcer(LIMITS),
  });
  return { provider, storage, repository, cache, pipeline };
}

describe("ImagePipeline", () => {
  it("stores a generated image with fake provider", async () => {
    const { provider, pipeline } = buildPipeline(new FakeMediaProvider());
    const outcome = await pipeline.run(makeJob());
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.asset.kind).toBe("image");
    expect(outcome.asset.scope.householdId).toBe(SCOPE.householdId);
    expect(outcome.result.status).toBe("stored");
    expect(outcome.result.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(outcome.asset.lifecycleStatus).toBe("active");
    expect(outcome.result.safetyFindings).toEqual([]);
    expect(provider.imageCallsSnapshot).toHaveLength(1);
  });

  it("serves a cache hit without calling the provider again", async () => {
    const { provider, pipeline } = buildPipeline(new FakeMediaProvider());
    const first = await pipeline.run(makeJob());
    expect(first.ok).toBe(true);
    const second = await pipeline.run(makeJob());
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(first.ok ? second.asset.id === first.asset.id : false).toBe(true);
    expect(second.result.attempts).toBe(0);
    expect(provider.imageCallsSnapshot).toHaveLength(1);
  });

  it("does not charge for cached generation", async () => {
    const { pipeline } = buildPipeline(new FakeMediaProvider());
    const first = await pipeline.run(makeJob());
    expect(first.ok).toBe(true);
    const second = await pipeline.run(makeJob());
    if (!second.ok) return;
    expect(second.result.actualCostUsd).toBe(0);
    expect(second.result.estimatedCostUsd).toBe(0);
  });

  it("blocks before provider call when cost limit exceeded", async () => {
    const provider = new FakeMediaProvider();
    const { pipeline } = buildPipeline(provider);
    const outcome = await pipeline.run(
      makeJob({
        sizePolicy: {
          ...IMAGE_POLICY,
          label: "large",
          width: 4096,
          height: 4096,
          quality: "high",
        },
      }),
    );
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.result.failureState).toBe("cost_limit_exceeded");
    expect(provider.imageCallsSnapshot).toHaveLength(0);
  });

  it("rejects on safety failure and never stores", async () => {
    const provider = new FakeMediaProvider();
    const { pipeline, storage } = buildPipeline(provider);
    const outcome = await pipeline.run(
      makeJob({ prompt: "a scene with violence" }),
    );
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.result.failureState).toBe("safety_rejected");
    expect(outcome.result.safetyFindings.length).toBeGreaterThan(0);
    expect(provider.imageCallsSnapshot).toHaveLength(0);
    expect(storage.size()).toBe(0);
  });

  it("rejects when provider is unavailable", async () => {
    const provider = new FakeMediaProvider();
    provider.failNextImageWith = "provider down";
    const { pipeline } = buildPipeline(provider);
    const outcome = await pipeline.run(makeJob());
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.result.failureState).toBe("provider_unavailable");
  });

  it("rejects when image does not match character identity", async () => {
    const provider = new FakeMediaProvider({
      imageBytes: new TextEncoder().encode("mismatched-image-without-traits"),
    });
    const { pipeline, storage } = buildPipeline(provider);
    const outcome = await pipeline.run(makeJob());
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.result.failureState).toBe("consistency_rejected");
    expect(outcome.result.consistencyFindings.length).toBeGreaterThan(0);
    expect(storage.size()).toBe(0);
  });

  it("isolates cache hits by household scope", async () => {
    const { provider, pipeline } = buildPipeline(new FakeMediaProvider());
    const first = await pipeline.run(makeJob());
    expect(first.ok).toBe(true);
    const otherHousehold = await pipeline.run(
      makeJob({
        requestId: "req:image-2",
        scope: { ...SCOPE, householdId: "other-household-id" },
      }),
    );
    expect(otherHousehold.ok).toBe(true);
    if (!otherHousehold.ok) return;
    expect(provider.imageCallsSnapshot).toHaveLength(2);
    expect(otherHousehold.result.fingerprint).not.toBe(
      first.ok ? first.result.fingerprint : "x",
    );
  });

  it("isolates cache hits by child profile scope", async () => {
    const { provider, pipeline } = buildPipeline(new FakeMediaProvider());
    const first = await pipeline.run(makeJob());
    expect(first.ok).toBe(true);
    const otherChild = await pipeline.run(
      makeJob({
        requestId: "req:image-3",
        scope: { ...SCOPE, childProfileId: "other-child-id" },
      }),
    );
    expect(otherChild.ok).toBe(true);
    if (!otherChild.ok) return;
    expect(provider.imageCallsSnapshot).toHaveLength(2);
    expect(otherChild.result.fingerprint).not.toBe(
      first.ok ? first.result.fingerprint : "x",
    );
  });
});
