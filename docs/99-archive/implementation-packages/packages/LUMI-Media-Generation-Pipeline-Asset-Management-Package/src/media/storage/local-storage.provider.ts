import { mkdir, writeFile, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  MediaStorageProvider,
  StoreAssetInput,
  StoredAsset,
} from "./storage-provider.types";

export class LocalMediaStorageProvider
  implements MediaStorageProvider
{
  readonly providerCode = "local";

  constructor(
    private readonly rootDirectory: string,
    private readonly publicBaseUrl: string,
  ) {}

  async store(
    input: StoreAssetInput,
  ): Promise<StoredAsset> {
    const fullPath = join(
      this.rootDirectory,
      input.key,
    );

    await mkdir(dirname(fullPath), {
      recursive: true,
    });

    await writeFile(
      fullPath,
      Buffer.from(input.bytes),
    );

    return {
      key: input.key,
      url: `${this.publicBaseUrl}/${input.key}`,
      sizeBytes: input.bytes.byteLength,
      mimeType: input.mimeType,
    };
  }

  async delete(key: string): Promise<void> {
    await unlink(
      join(this.rootDirectory, key),
    );
  }
}
