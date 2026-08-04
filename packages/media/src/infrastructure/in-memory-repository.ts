import type {
  AssetGenerationMeta,
  AssetScope,
  AssetVariant,
  StoredAsset,
} from "../domain/asset";
import type { MediaAssetRepositoryPort } from "../ports/repository.port";

export class InMemoryMediaAssetRepository implements MediaAssetRepositoryPort {
  private readonly assets = new Map<string, StoredAsset>();
  private readonly variants = new Map<string, AssetVariant>();
  private readonly generations = new Map<string, AssetGenerationMeta>();

  constructor() {}

  async createAsset(asset: StoredAsset): Promise<StoredAsset> {
    this.assets.set(asset.id, asset);
    return asset;
  }

  async getAsset(id: string): Promise<StoredAsset | null> {
    return this.assets.get(id) ?? null;
  }

  async getAssetInScope(
    id: string,
    scope: AssetScope,
  ): Promise<StoredAsset | null> {
    const asset = this.assets.get(id);
    if (!asset) return null;
    if (asset.scope.householdId !== scope.householdId) return null;
    if (asset.scope.childProfileId !== scope.childProfileId) return null;
    return asset;
  }

  async listAssetsInScope(
    scope: AssetScope,
    limit = 50,
  ): Promise<StoredAsset[]> {
    return [...this.assets.values()]
      .filter(
        (a) =>
          a.scope.householdId === scope.householdId &&
          a.scope.childProfileId === scope.childProfileId,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getAssetByFingerprint(
    fingerprint: string,
    scope: AssetScope,
  ): Promise<StoredAsset | null> {
    const match = [...this.assets.values()].find(
      (a) =>
        a.fingerprint === fingerprint &&
        a.scope.householdId === scope.householdId &&
        a.scope.childProfileId === scope.childProfileId,
    );
    return match ?? null;
  }

  async updateLifecycle(
    id: string,
    status: StoredAsset["lifecycleStatus"],
  ): Promise<StoredAsset | null> {
    const asset = this.assets.get(id);
    if (!asset) return null;
    const updated: StoredAsset = { ...asset, lifecycleStatus: status };
    this.assets.set(id, updated);
    return updated;
  }

  async createVariant(variant: AssetVariant): Promise<AssetVariant> {
    this.variants.set(variant.id, variant);
    return variant;
  }

  async createGenerationMeta(
    meta: AssetGenerationMeta,
  ): Promise<AssetGenerationMeta> {
    this.generations.set(meta.id, meta);
    return meta;
  }
}
