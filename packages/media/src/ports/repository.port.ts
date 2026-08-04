import type {
  AssetGenerationMeta,
  AssetScope,
  AssetVariant,
  StoredAsset,
} from "../domain/asset";

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
