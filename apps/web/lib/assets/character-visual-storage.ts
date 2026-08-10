import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

import type { CharacterVisualStoragePort } from "@lumi/profiles/application";

const STORAGE_PREFIX = "local-character-visual://";

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

export class LocalCharacterVisualStorageAdapter
  implements CharacterVisualStoragePort
{
  async store(
    input: Parameters<CharacterVisualStoragePort["store"]>[0],
  ): Promise<{ storageRef: string }> {
    const relative = [
      input.householdId,
      input.characterId,
      input.jobId,
      `${input.candidateIndex}${extensionForMime(input.mimeType)}`,
    ].join("/");
    const absolute = resolve(storageRoot(), relative);
    await mkdir(resolve(absolute, ".."), { recursive: true });
    await writeFile(absolute, Buffer.from(input.bytesBase64, "base64"));
    return { storageRef: `${STORAGE_PREFIX}${relative}` };
  }
}

export async function readLocalCharacterVisual(storageRef: string) {
  if (!storageRef.startsWith(STORAGE_PREFIX)) {
    throw new Error("UNSUPPORTED_VISUAL_STORAGE_REF");
  }

  const relative = storageRef.slice(STORAGE_PREFIX.length);
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
