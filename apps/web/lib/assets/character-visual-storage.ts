import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

import type { CharacterVisualStoragePort } from "@lumi/profiles/application";
import {
  deleteObject,
  getObject,
  putObject,
  type S3CompatibleObjectStorageConfig,
} from "./s3-compatible-object-storage";

const LOCAL_STORAGE_PREFIX = "local-character-visual://";
const S3_STORAGE_PREFIX = "s3-character-visual://";

function storageRoot(): string {
  return resolve(
    process.env.LUMI_ASSET_STORAGE_DIR ??
      resolve(process.cwd(), ".lumi-assets"),
    "character-visuals",
  );
}

function extensionForMime(mimeType: string): string {
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/webp") return ".webp";
  return ".png";
}

function relativeObjectKey(
  input: Parameters<CharacterVisualStoragePort["store"]>[0],
): string {
  return [
    "character-visuals",
    input.householdId,
    input.characterId,
    input.jobId,
    `${input.candidateIndex}${input.variantKey ? `-${input.variantKey}` : ""}${extensionForMime(input.mimeType)}`,
  ].join("/");
}

export function objectStorageConfigFromEnv(): S3CompatibleObjectStorageConfig | null {
  const endpoint = process.env.OBJECT_STORAGE_ENDPOINT;
  const bucket = process.env.OBJECT_STORAGE_BUCKET;
  const accessKeyId = process.env.OBJECT_STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;
  return {
    endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
    region: process.env.OBJECT_STORAGE_REGION ?? "auto",
  };
}

function configForReferencedBucket(
  config: S3CompatibleObjectStorageConfig,
  bucket: string,
): S3CompatibleObjectStorageConfig {
  // storageRef is persisted together with the authorized asset record. Older
  // records may legitimately point at a previous R2 bucket name, so reads must
  // honor the bucket encoded in that immutable reference instead of assuming
  // today's write bucket. Credentials still determine whether that bucket is
  // actually accessible.
  return bucket === config.bucket ? config : { ...config, bucket };
}

export class LocalCharacterVisualStorageAdapter
  implements CharacterVisualStoragePort
{
  async store(
    input: Parameters<CharacterVisualStoragePort["store"]>[0],
  ): Promise<{ storageRef: string }> {
    const relative = relativeObjectKey(input).replace(
      /^character-visuals\//,
      "",
    );
    const absolute = resolve(storageRoot(), relative);
    await mkdir(resolve(absolute, ".."), { recursive: true });
    await writeFile(absolute, Buffer.from(input.bytesBase64, "base64"));
    return { storageRef: `${LOCAL_STORAGE_PREFIX}${relative}` };
  }
}

export class S3CompatibleCharacterVisualStorageAdapter
  implements CharacterVisualStoragePort
{
  constructor(private readonly config: S3CompatibleObjectStorageConfig) {}

  async store(
    input: Parameters<CharacterVisualStoragePort["store"]>[0],
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
}

export function createCharacterVisualStorageAdapter(): CharacterVisualStoragePort {
  const config = objectStorageConfigFromEnv();
  return config
    ? new S3CompatibleCharacterVisualStorageAdapter(config)
    : new LocalCharacterVisualStorageAdapter();
}

export async function readCharacterVisual(storageRef: string) {
  if (storageRef.startsWith(LOCAL_STORAGE_PREFIX)) {
    const relative = storageRef.slice(LOCAL_STORAGE_PREFIX.length);
    const root = storageRoot();
    const absolute = resolve(root, relative);
    if (absolute !== root && !absolute.startsWith(`${root}${sep}`)) {
      throw new Error("INVALID_VISUAL_STORAGE_REF");
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
    if (slash <= 0) throw new Error("INVALID_VISUAL_STORAGE_REF");
    const bucket = decodeURIComponent(value.slice(0, slash));
    const key = value.slice(slash + 1);
    const object = await getObject(configForReferencedBucket(config, bucket), key);
    return {
      bytes: object.bytes,
      mimeType: object.contentType ?? "application/octet-stream",
    };
  }

  throw new Error("UNSUPPORTED_VISUAL_STORAGE_REF");
}

export async function deleteCharacterVisual(storageRef: string): Promise<void> {
  if (!storageRef.startsWith(S3_STORAGE_PREFIX)) return;
  const config = objectStorageConfigFromEnv();
  if (!config) throw new Error("OBJECT_STORAGE_NOT_CONFIGURED");
  const value = storageRef.slice(S3_STORAGE_PREFIX.length);
  const slash = value.indexOf("/");
  if (slash <= 0) throw new Error("INVALID_VISUAL_STORAGE_REF");
  const bucket = decodeURIComponent(value.slice(0, slash));
  await deleteObject(
    configForReferencedBucket(config, bucket),
    value.slice(slash + 1),
  );
}
