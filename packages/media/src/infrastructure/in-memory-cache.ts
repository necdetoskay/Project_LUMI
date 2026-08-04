import type { AssetScope, StoredAsset } from "../domain/asset";
import type { FingerprintCachePort } from "../ports/cache.port";

export class InMemoryFingerprintCache implements FingerprintCachePort {
  private readonly cache = new Map<string, StoredAsset>();

  constructor() {}

  private key(fingerprint: string, scope: AssetScope): string {
    return `${scope.householdId}:${scope.childProfileId}:${fingerprint}`;
  }

  async get(
    fingerprint: string,
    scope: AssetScope,
  ): Promise<StoredAsset | null> {
    return this.cache.get(this.key(fingerprint, scope)) ?? null;
  }

  async put(
    fingerprint: string,
    scope: AssetScope,
    asset: StoredAsset,
  ): Promise<void> {
    this.cache.set(this.key(fingerprint, scope), asset);
  }

  async invalidate(fingerprint: string, scope: AssetScope): Promise<void> {
    this.cache.delete(this.key(fingerprint, scope));
  }

  size(): number {
    return this.cache.size;
  }
}
