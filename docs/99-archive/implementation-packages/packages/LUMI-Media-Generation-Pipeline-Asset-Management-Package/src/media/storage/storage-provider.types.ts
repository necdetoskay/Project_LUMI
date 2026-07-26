export type StoreAssetInput = {
  key: string;
  bytes: Uint8Array;
  mimeType: string;
  metadata?: Record<string, string>;
};

export type StoredAsset = {
  key: string;
  url: string;
  sizeBytes: number;
  mimeType: string;
};

export interface MediaStorageProvider {
  readonly providerCode: string;

  store(
    input: StoreAssetInput,
  ): Promise<StoredAsset>;

  delete(key: string): Promise<void>;
}
