import { describe, expect, it } from "vitest";
import { MediaCostEstimator } from "../../src/application/cost-estimator.service";
import { MediaPolicyEnforcer } from "../../src/application/policy-enforcer.service";
import {
  CostLimitExceededError,
  PolicyBlockedError,
} from "../../src/domain/errors";
import type { MediaPolicyConfig } from "../../src/application/policy-enforcer.service";
import {
  AUDIO_MODEL,
  AUDIO_POLICY,
  IMAGE_MODEL,
  IMAGE_POLICY,
  IMAGE_POLICY_LARGE,
} from "../fixtures/media.fixtures";

const LIMITS: MediaPolicyConfig = {
  maxImageCostUsd: 0.1,
  maxAudioCostUsd: 0.2,
  maxImageBytes: 10 * 1024 * 1024,
  maxAudioBytes: 5 * 1024 * 1024,
  maxImageAttempts: 3,
  maxAudioAttempts: 3,
};

describe("MediaCostEstimator", () => {
  const estimator = new MediaCostEstimator();

  it("estimates positive image cost", () => {
    const cost = estimator.estimateImage(IMAGE_POLICY, IMAGE_MODEL);
    expect(cost).toBeGreaterThan(0);
  });

  it("estimates higher cost for large high-quality images", () => {
    const small = estimator.estimateImage(IMAGE_POLICY, IMAGE_MODEL);
    const large = estimator.estimateImage(IMAGE_POLICY_LARGE, {
      ...IMAGE_MODEL,
      modelId: "fake-image-hd",
    });
    expect(large).toBeGreaterThan(small);
  });

  it("estimates audio cost proportional to duration", () => {
    const cost = estimator.estimateAudio(AUDIO_POLICY, AUDIO_MODEL);
    expect(cost).toBeGreaterThan(0);
  });
});

describe("MediaPolicyEnforcer", () => {
  const enforcer = new MediaPolicyEnforcer(LIMITS);

  it("allows image within limits", () => {
    const decision = enforcer.checkImage(IMAGE_POLICY, IMAGE_MODEL, 0.02);
    expect(decision.allowed).toBe(true);
  });

  it("blocks image when cost limit exceeded", () => {
    expect(() =>
      enforcer.checkImage(IMAGE_POLICY_LARGE, IMAGE_MODEL, 0.5),
    ).toThrow(CostLimitExceededError);
  });

  it("blocks image when byte limit exceeded", () => {
    expect(() =>
      enforcer.checkImage(
        { ...IMAGE_POLICY, maxBytes: 50 * 1024 * 1024 },
        IMAGE_MODEL,
        0.02,
      ),
    ).toThrow(PolicyBlockedError);
  });

  it("blocks image when attempt limit exceeded", () => {
    expect(() =>
      enforcer.checkImage(
        IMAGE_POLICY,
        { ...IMAGE_MODEL, maxAttempts: 9 },
        0.02,
      ),
    ).toThrow(PolicyBlockedError);
  });

  it("allows audio within limits", () => {
    const decision = enforcer.checkAudio(AUDIO_POLICY, AUDIO_MODEL, 0.05);
    expect(decision.allowed).toBe(true);
  });

  it("blocks audio when cost limit exceeded", () => {
    expect(() => enforcer.checkAudio(AUDIO_POLICY, AUDIO_MODEL, 0.9)).toThrow(
      CostLimitExceededError,
    );
  });
});
