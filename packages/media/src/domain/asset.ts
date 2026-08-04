import type {
  AssetLifecycleStatus,
  AudioAssetType,
  ImageAssetType,
  MediaKind,
} from "./media-types";

export interface AssetScope {
  householdId: string;
  childProfileId: string;
  worldId: string;
}

export interface StoredAsset {
  id: string;
  kind: MediaKind;
  assetType: ImageAssetType | AudioAssetType;
  mimeType: string;
  storageProvider: string;
  storageKey: string;
  checksum: string;
  byteSize: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  lifecycleStatus: AssetLifecycleStatus;
  scope: AssetScope;
  fingerprint: string;
  createdAt: Date;
}

export interface AssetVariant {
  id: string;
  assetId: string;
  variantKey: string;
  storageKey: string;
  width?: number;
  height?: number;
  mimeType: string;
}

export interface AssetGenerationMeta {
  id: string;
  assetId: string;
  providerId: string;
  modelId: string;
  promptHash: string;
  seed?: string | undefined;
  costUsd: number;
  createdAt: Date;
}
