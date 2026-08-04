import type {
  AudioDurationPolicy,
  ImageSizePolicy,
  MediaModelPolicy,
} from "../domain/media-types";

export interface MediaCostEstimatePort {
  estimateImage(
    sizePolicy: ImageSizePolicy,
    modelPolicy: MediaModelPolicy,
  ): number;
  estimateAudio(
    durationPolicy: AudioDurationPolicy,
    modelPolicy: MediaModelPolicy,
  ): number;
}

export interface PolicyDecision {
  allowed: boolean;
  reason?: string | undefined;
  estimatedCostUsd: number;
}

export interface MediaPolicyPort {
  maxImageCostUsd: number;
  maxAudioCostUsd: number;
  maxImageBytes: number;
  maxAudioBytes: number;
  maxImageAttempts: number;
  maxAudioAttempts: number;
  checkImage(
    sizePolicy: ImageSizePolicy,
    modelPolicy: MediaModelPolicy,
    estimatedCostUsd: number,
  ): PolicyDecision;
  checkAudio(
    durationPolicy: AudioDurationPolicy,
    modelPolicy: MediaModelPolicy,
    estimatedCostUsd: number,
  ): PolicyDecision;
}
