import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

import type { ImageGenerationBinaryStoragePort } from "@lumi/profiles/application";
import {
  deleteObject,
  getObject,
  putObject,
  type S3CompatibleObjectStorageConfig,
} from "./s3-compatible-object-storage";
import { objectStorageConfigFromEnv } from "./character-visual-storage";

const LOCAL_STORAGE_PREFIX = "local-managed-image://";
const S3_STORAGE_PREFIX = "s3-managed-image://";

function storageRoot(): string {
  return resolve(
    process.env.LUMI_ASSET_STORAGE_DIR ?? resolve(process.cwd(), ".lumi-assets"),
    "managed-images",
  );
}

function extensionForMime(mimeType: string): string {
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/webp") return ".webp";
  return ".png";
}

function relativeObjectKey(
  input: Parameters<ImageGenerationBinaryStoragePort["store"]>[0],
): string {
  return [
    "managed-images",
    input.householdId,
    input.subjectType,
    input.subjectId,
    input.assetKind,
    input.jobId,
    `${input.candidateIndex}${extensionForMime(input.mimeType)}`,
  ].join("/");
}

export class LocalManagedImageStorageAdapter
  implements ImageGenerationBinaryStoragePort
{
  async store(
    input: Parameters<ImageGenerationBinaryStoragePort["store"]>[0],
  ): Promise<{ storageRef: string }> {
    const relative = relativeObjectKey(input).replace(/^managed-images\//, "");
    const absolute = resolve(storageRoot(), relative);
    await mkdir(resolve(absolute, ".."), { recursive: true });
    await writeFile(absolute, Buffer.from(input.bytesBase64, "base64"));
    return { storageRef: `${LOCAL_STORAGE_PREFIX}${relative}` };
  }

  async delete(storageRef: string): Promise<void> {
    if (!storageRef.startsWith(LOCAL_STORAGE_PREFIX)) return;
    const absolute = resolve(
      storageRoot(),
      storageRef.slice(LOCAL_STORAGE_PREFIX.length),
    );
    const root = storageRoot();
    if (absolute !== root && !absolute.startsWith(`${root}${sep}`)) {
      throw new Error("INVALID_MANAGED_IMAGE_STORAGE_REF");
    }
    await rm(absolute, { force: true });
  }
}

export class S3CompatibleManagedImageStorageAdapter
  implements ImageGenerationBinaryStoragePort
{
  constructor(private readonly config: S3CompatibleObjectStorageConfig) {}

  async store(
    input: Parameters<ImageGenerationBinaryStoragePort["store"]>[0],
  ): Promise<{ storageRef: string }> {
    const key = relativeObjectKey(input);
    await putObject(
      this.config,
      key,
      Buffer.from(input.bytesBase64, "base64"),
      input.mimeType,
    );
    return {
      storageRef: `${S3_STORAGE_PREFIX}${encodeURIComponent(this.config.bucket)}/${key}`,
    };
  }

  async delete(storageRef: string): Promise<void> {
    if (!storageRef.startsWith(S3_STORAGE_PREFIX)) return;
    const value = storageRef.slice(S3_STORAGE_PREFIX.length);
    const slash = value.indexOf("/");
    if (slash <= 0) throw new Error("INVALID_MANAGED_IMAGE_STORAGE_REF");
    const bucket = decodeURIComponent(value.slice(0, slash));
    if (bucket !== this.config.bucket) {
      throw new Error("MANAGED_IMAGE_STORAGE_BUCKET_MISMATCH");
    }
    await deleteObject(this.config, value.slice(slash + 1));
  }
}

export function createManagedImageStorageAdapter(): ImageGenerationBinaryStoragePort {
  const config = objectStorageConfigFromEnv();
  return config
    ? new S3CompatibleManagedImageStorageAdapter(config)
    : new LocalManagedImageStorageAdapter();
}

export async function readManagedImage(storageRef: string) {
  if (storageRef.startsWith(LOCAL_STORAGE_PREFIX)) {
    const root = storageRoot();
    const absolute = resolve(root, storageRef.slice(LOCAL_STORAGE_PREFIX.length));
    if (absolute !== root && !absolute.startsWith(`${root}${sep}`)) {
      throw new Error("INVALID_MANAGED_IMAGE_STORAGE_REF");
    }
    const extension = extname(absolute).toLowerCase();
    const mimeType =
      extension === ".jpg" || extension === ".jpeg"
        ? "image/jpeg"
        : extension === ".webp"
          ? "image/webp"
          : "image/png";
    return { bytes: await readFile(absolute), mimeType };
  }

  if (storageRef.startsWith(S3_STORAGE_PREFIX)) {
    const config = objectStorageConfigFromEnv();
    if (!config) throw new Error("OBJECT_STORAGE_NOT_CONFIGURED");
    const value = storageRef.slice(S3_STORAGE_PREFIX.length);
    const slash = value.indexOf("/");
    if (slash <= 0) throw new Error("INVALID_MANAGED_IMAGE_STORAGE_REF");
    const bucket = decodeURIComponent(value.slice(0, slash));
    if (bucket !== config.bucket) {
      throw new Error("MANAGED_IMAGE_STORAGE_BUCKET_MISMATCH");
    }
    const object = await getObject(config, value.slice(slash + 1));
    return {
      bytes: object.bytes,
      mimeType: object.contentType ?? "application/octet-stream",
    };
  }

  throw new Error("UNSUPPORTED_MANAGED_IMAGE_STORAGE_REF");
}
