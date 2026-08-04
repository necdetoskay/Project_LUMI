import type { AssetScope } from "../domain/asset";

export interface ObjectStoragePort {
  readonly providerId: string;
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}

export interface StoredObject {
  key: string;
  bytes: Uint8Array;
  contentType: string;
  scope: AssetScope;
  storedAt: Date;
}

export interface ObjectStorageWithMetadata extends ObjectStoragePort {
  putScoped(object: StoredObject): Promise<string>;
  getScoped(key: string, scope: AssetScope): Promise<StoredObject | null>;
}
