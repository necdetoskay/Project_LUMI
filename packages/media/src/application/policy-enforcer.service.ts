import { CostLimitExceededError, PolicyBlockedError } from "../domain/errors";
import type {
  AudioDurationPolicy,
  ImageSizePolicy,
  MediaModelPolicy,
} from "../domain/media-types";
import type {
  MediaPolicyPort,
  PolicyDecision,
} from "../ports/policy.port";

export interface MediaPolicyConfig {
  maxImageCostUsd: number;
  maxAudioCostUsd: number;
  maxImageBytes: number;
  maxAudioBytes: number;
  maxImageAttempts: number;
  maxAudioAttempts: number;
}

export class MediaPolicyEnforcer implements MediaPolicyPort {
  readonly maxImageCostUsd: number;
  readonly maxAudioCostUsd: number;
  readonly maxImageBytes: number;
  readonly maxAudioBytes: number;
  readonly maxImageAttempts: number;
  readonly maxAudioAttempts: number;

  constructor(policy: MediaPolicyConfig) {
    this.maxImageCostUsd = policy.maxImageCostUsd;
    this.maxAudioCostUsd = policy.maxAudioCostUsd;
    this.maxImageBytes = policy.maxImageBytes;
    this.maxAudioBytes = policy.maxAudioBytes;
    this.maxImageAttempts = policy.maxImageAttempts;
    this.maxAudioAttempts = policy.maxAudioAttempts;
  }

  checkImage(
    sizePolicy: ImageSizePolicy,
    modelPolicy: MediaModelPolicy,
    estimatedCostUsd: number,
  ): PolicyDecision {
    if (estimatedCostUsd > this.maxImageCostUsd) {
      throw new CostLimitExceededError(
        `Image cost ${estimatedCostUsd} exceeds limit ${this.maxImageCostUsd}`,
      );
    }
    if (sizePolicy.maxBytes > this.maxImageBytes) {
      throw new PolicyBlockedError(
        `Image size ${sizePolicy.maxBytes} exceeds max ${this.maxImageBytes}`,
      );
    }
    if (modelPolicy.maxAttempts > this.maxImageAttempts) {
      throw new PolicyBlockedError(
        `Image attempts ${modelPolicy.maxAttempts} exceed max ${this.maxImageAttempts}`,
      );
    }
    return { allowed: true, estimatedCostUsd };
  }

  checkAudio(
    durationPolicy: AudioDurationPolicy,
    modelPolicy: MediaModelPolicy,
    estimatedCostUsd: number,
  ): PolicyDecision {
    if (estimatedCostUsd > this.maxAudioCostUsd) {
      throw new CostLimitExceededError(
        `Audio cost ${estimatedCostUsd} exceeds limit ${this.maxAudioCostUsd}`,
      );
    }
    if (durationPolicy.maxBytes > this.maxAudioBytes) {
      throw new PolicyBlockedError(
        `Audio size ${durationPolicy.maxBytes} exceeds max ${this.maxAudioBytes}`,
      );
    }
    if (modelPolicy.maxAttempts > this.maxAudioAttempts) {
      throw new PolicyBlockedError(
        `Audio attempts ${modelPolicy.maxAttempts} exceed max ${this.maxAudioAttempts}`,
      );
    }
    return { allowed: true, estimatedCostUsd };
  }
}
