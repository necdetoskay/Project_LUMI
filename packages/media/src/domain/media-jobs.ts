import type { AssetScope } from "./asset";
import type {
  AudioDurationPolicy,
  ImageAssetType,
  ImageSizePolicy,
  MediaModelPolicy,
} from "./media-types";
import type { CharacterVisualIdentity, VoiceProfile } from "./identity";
import type { ConsistencyFinding, SafetyFinding } from "./findings";
import type { MediaFailureState, MediaJobStatus } from "./media-types";

export interface ImageJobRequest {
  requestId: string;
  scope: AssetScope;
  assetType: ImageAssetType;
  prompt: string;
  identity?: CharacterVisualIdentity | undefined;
  sizePolicy: ImageSizePolicy;
  modelPolicy: MediaModelPolicy;
  seed?: string | undefined;
  contentKey: string;
}

export interface TtsJobRequest {
  requestId: string;
  scope: AssetScope;
  assetType: "narration";
  text: string;
  voice: VoiceProfile;
  durationPolicy: AudioDurationPolicy;
  modelPolicy: MediaModelPolicy;
  seed?: string | undefined;
  contentKey: string;
}

export interface AudioJobRequest {
  requestId: string;
  scope: AssetScope;
  assetType: "ambience" | "sound_effect";
  tags: string[];
  durationPolicy: AudioDurationPolicy;
  modelPolicy: MediaModelPolicy;
  seed?: string | undefined;
  contentKey: string;
}

export type MediaJobRequest =
  | { kind: "image"; job: ImageJobRequest }
  | { kind: "audio"; job: TtsJobRequest }
  | { kind: "audio"; job: AudioJobRequest };

export interface CostEstimate {
  estimatedCostUsd: number;
  currency: "usd";
  policyKey: string;
}

export interface MediaJobResult {
  requestId: string;
  kind: "image" | "audio";
  status: MediaJobStatus;
  fingerprint: string;
  assetId?: string;
  estimatedCostUsd: number;
  actualCostUsd?: number;
  attempts: number;
  providerId?: string;
  modelId?: string;
  safetyFindings: SafetyFinding[];
  consistencyFindings: ConsistencyFinding[];
  failureState?: MediaFailureState | undefined;
}
