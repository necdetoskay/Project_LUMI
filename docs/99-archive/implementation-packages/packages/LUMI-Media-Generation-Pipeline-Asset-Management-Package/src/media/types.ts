export type MediaType =
  | "image"
  | "audio"
  | "thumbnail";

export type MediaAssetStatus =
  | "pending"
  | "approved"
  | "generating"
  | "moderation_failed"
  | "failed"
  | "ready"
  | "cancelled";

export type MediaPurpose =
  | "story_page"
  | "character_avatar"
  | "world_map"
  | "item_icon"
  | "story_audio"
  | "ambient_audio"
  | "thumbnail";

export type MediaRequest = {
  id: string;
  worldId: string;
  storyId?: string;
  storyNodeId?: string;
  characterId?: string;
  childProfileId?: string;
  mediaType: MediaType;
  purpose: MediaPurpose;
  status: MediaAssetStatus;
  promptTemplateCode: string;
  promptVariables: Record<string, unknown>;
  estimatedCostTry: number;
  actualCostTry?: number;
  providerCode?: string;
  modelCode?: string;
  createdAt: Date;
};

export type GeneratedAsset = {
  mimeType: string;
  bytes: Uint8Array;
  width?: number;
  height?: number;
  durationMs?: number;
  providerRequestId?: string;
  usage?: {
    megapixels?: number;
    characters?: number;
    inputTokens?: number;
    outputTokens?: number;
  };
};
