import type {
  AudioDurationPolicy,
  ImageSizePolicy,
  MediaModelPolicy,
} from "../domain/media-types";
import type { MediaCostEstimatePort } from "../ports/policy.port";

const IMAGE_PRICE_PER_MP_MODEL: Record<string, number> = {
  standard: 0.02,
  high: 0.08,
};

const AUDIO_PRICE_PER_SECOND_MODEL: Record<string, number> = {
  standard: 0.002,
  high: 0.006,
};

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export class MediaCostEstimator implements MediaCostEstimatePort {
  estimateImage(
    sizePolicy: ImageSizePolicy,
    modelPolicy: MediaModelPolicy,
  ): number {
    const megaPixels = (sizePolicy.width * sizePolicy.height) / 1_000_000;
    const quality = sizePolicy.quality;
    const base = (IMAGE_PRICE_PER_MP_MODEL[quality] ?? 0.02) * megaPixels;
    const modelMultiplier =
      modelPolicy.modelId.includes("hd") ||
      modelPolicy.modelId.includes("large")
        ? 2
        : 1;
    return round4(base * modelMultiplier);
  }

  estimateAudio(
    durationPolicy: AudioDurationPolicy,
    modelPolicy: MediaModelPolicy,
  ): number {
    const seconds = Math.min(
      durationPolicy.maxSeconds,
      durationPolicy.maxBytes /
        Math.max(1, (durationPolicy.bitrateKbps * 1024) / 8),
    );
    const quality = modelPolicy.modelId.includes("hd") ? "high" : "standard";
    const base = (AUDIO_PRICE_PER_SECOND_MODEL[quality] ?? 0.002) * seconds;
    return round4(base);
  }
}
