import { z } from "zod";

export const MEDIA_KINDS = ["image", "audio"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const IMAGE_ASSET_TYPES = [
  "illustration",
  "character_portrait",
  "scene",
  "map",
  "icon",
  "thumbnail",
] as const;
export type ImageAssetType = (typeof IMAGE_ASSET_TYPES)[number];

export const AUDIO_ASSET_TYPES = [
  "narration",
  "ambience",
  "sound_effect",
] as const;
export type AudioAssetType = (typeof AUDIO_ASSET_TYPES)[number];

export const ASSET_LIFECYCLE_STATUSES = [
  "draft",
  "active",
  "archived",
] as const;
export type AssetLifecycleStatus = (typeof ASSET_LIFECYCLE_STATUSES)[number];

export const MEDIA_JOB_STATUSES = [
  "pending",
  "estimated",
  "policy_blocked",
  "generating",
  "validated",
  "stored",
  "failed",
] as const;
export type MediaJobStatus = (typeof MEDIA_JOB_STATUSES)[number];

export const MEDIA_FAILURE_STATES = [
  "policy_blocked",
  "cost_limit_exceeded",
  "provider_unavailable",
  "provider_timeout",
  "safety_rejected",
  "consistency_rejected",
  "storage_failed",
  "internal_error",
] as const;
export type MediaFailureState = (typeof MEDIA_FAILURE_STATES)[number];

export const IMAGE_QUALITY_LEVELS = ["standard", "high"] as const;
export type ImageQualityLevel = (typeof IMAGE_QUALITY_LEVELS)[number];

export const IMAGE_SIZES = ["small", "medium", "large"] as const;
export type ImageSizeLabel = (typeof IMAGE_SIZES)[number];

export const MEDIA_KIND_SCHEMA = z.enum(MEDIA_KINDS);
export const IMAGE_ASSET_TYPE_SCHEMA = z.enum(IMAGE_ASSET_TYPES);
export const AUDIO_ASSET_TYPE_SCHEMA = z.enum(AUDIO_ASSET_TYPES);
export const ASSET_LIFECYCLE_STATUS_SCHEMA = z.enum(ASSET_LIFECYCLE_STATUSES);
export const MEDIA_JOB_STATUS_SCHEMA = z.enum(MEDIA_JOB_STATUSES);
export const MEDIA_FAILURE_STATE_SCHEMA = z.enum(MEDIA_FAILURE_STATES);

export const imageSizePolicySchema = z.object({
  label: z.enum(IMAGE_SIZES),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  quality: z.enum(IMAGE_QUALITY_LEVELS),
  maxBytes: z.number().int().positive(),
});

export interface ImageSizePolicy {
  label: ImageSizeLabel;
  width: number;
  height: number;
  quality: ImageQualityLevel;
  maxBytes: number;
}

export const audioDurationPolicySchema = z.object({
  maxSeconds: z.number().int().positive(),
  bitrateKbps: z.number().int().positive(),
  maxBytes: z.number().int().positive(),
});

export interface AudioDurationPolicy {
  maxSeconds: number;
  bitrateKbps: number;
  maxBytes: number;
}

export const mediaModelPolicySchema = z.object({
  providerId: z.string().min(1),
  modelId: z.string().min(1),
  maxAttempts: z.number().int().min(1).max(5).default(3),
  timeoutMs: z.number().int().positive().default(60_000),
});

export interface MediaModelPolicy {
  providerId: string;
  modelId: string;
  maxAttempts: number;
  timeoutMs: number;
}
