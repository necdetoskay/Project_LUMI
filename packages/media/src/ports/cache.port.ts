import type { AssetScope, StoredAsset } from "../domain/asset";

export interface FingerprintCachePort {
  get(fingerprint: string, scope: AssetScope): Promise<StoredAsset | null>;
  put(
    fingerprint: string,
    scope: AssetScope,
    asset: StoredAsset,
  ): Promise<void>;
  invalidate(fingerprint: string, scope: AssetScope): Promise<void>;
}
