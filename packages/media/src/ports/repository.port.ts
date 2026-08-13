import type {
  AssetGenerationMeta,
  AssetScope,
  AssetVariant,
  StoredAsset,
} from "../domain/asset";
import type {
  StoryVisualAssetSet,
  StoryVisualManifest,
} from "../domain/story-visual-manifest";

export interface MediaAssetRepositoryPort {
  createAsset(asset: StoredAsset): Promise<StoredAsset>;
  getAsset(id: string): Promise<StoredAsset | null>;
  getAssetInScope(id: string, scope: AssetScope): Promise<StoredAsset | null>;
  listAssetsInScope(scope: AssetScope, limit?: number): Promise<StoredAsset[]>;
  getAssetByFingerprint(
    fingerprint: string,
    scope: AssetScope,
  ): Promise<StoredAsset | null>;
  updateLifecycle(
    id: string,
    status: StoredAsset["lifecycleStatus"],
  ): Promise<StoredAsset | null>;
  createVariant(variant: AssetVariant): Promise<AssetVariant>;
  createGenerationMeta(meta: AssetGenerationMeta): Promise<AssetGenerationMeta>;
}

export type StoryVisualRenderStatus =
  | "planned"
  | "reused"
  | "missing"
  | "generating"
  | "ready"
  | "failed";

export type StoryVisualRenderTargetKind =
  | "entity-render"
  | "story-illustration";

export type PersistedStoryVisualManifest = {
  id: string;
  scope: AssetScope;
  storyId: string;
  manifestFingerprint: string;
  manifest: StoryVisualManifest;
  createdAt: Date;
};

export type PersistedStoryVisualAssetSet = StoryVisualAssetSet & {
  manifestId: string;
  scope: AssetScope;
  createdAt: string;
};

export type PersistedStoryVisualRender = {
  id: string;
  assetSetId: string;
  targetKind: StoryVisualRenderTargetKind;
  targetId: string;
  manifestEntityId?: string | null;
  resolvedEntityId?: string | null;
  variantId?: string | null;
  stateId?: string | null;
  renderFingerprint: string;
  assetId?: string | null;
  status: StoryVisualRenderStatus;
  createdAt: Date;
  updatedAt: Date;
};

export interface StoryVisualWorkspaceRepositoryPort {
  createManifest(input: {
    id: string;
    scope: AssetScope;
    manifestFingerprint: string;
    manifest: StoryVisualManifest;
  }): Promise<PersistedStoryVisualManifest>;

  getLatestManifest(
    storyId: string,
    scope: AssetScope,
  ): Promise<PersistedStoryVisualManifest | null>;

  createAssetSet(input: {
    manifestId: string;
    scope: AssetScope;
    assetSet: StoryVisualAssetSet;
  }): Promise<PersistedStoryVisualAssetSet>;

  getActiveAssetSet(
    storyId: string,
    scope: AssetScope,
  ): Promise<PersistedStoryVisualAssetSet | null>;

  setActiveAssetSet(
    assetSetId: string,
    storyId: string,
    scope: AssetScope,
  ): Promise<PersistedStoryVisualAssetSet | null>;

  createRender(
    render: Omit<PersistedStoryVisualRender, "createdAt" | "updatedAt">,
  ): Promise<PersistedStoryVisualRender>;

  updateRender(
    renderId: string,
    patch: {
      assetId?: string | null;
      status?: StoryVisualRenderStatus;
    },
  ): Promise<PersistedStoryVisualRender | null>;

  findReusableRender(
    renderFingerprint: string,
    scope: AssetScope,
  ): Promise<PersistedStoryVisualRender | null>;

  listRenders(assetSetId: string): Promise<PersistedStoryVisualRender[]>;
}
