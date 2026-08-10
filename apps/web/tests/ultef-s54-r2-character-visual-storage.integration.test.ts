import { afterAll, describe, expect, it } from "vitest";

import {
  createCharacterVisualStorageAdapter,
  deleteCharacterVisual,
  readCharacterVisual,
} from "@/lib/assets/character-visual-storage";

const enabled = process.env.ULTEF_S54_R2_ENABLE === "true";
const describeS54 = enabled ? describe : describe.skip;

const createdRefs: string[] = [];

describeS54("S54 portable character visual storage", () => {
  afterAll(async () => {
    await Promise.all(createdRefs.map((ref) => deleteCharacterVisual(ref)));
  });

  it("stores, reads and deletes an asset through the configured S3-compatible provider", async () => {
    const storage = createCharacterVisualStorageAdapter();
    const bytes = Buffer.from(`lumi-s54-${crypto.randomUUID()}`, "utf8");

    const stored = await storage.store({
      householdId: crypto.randomUUID(),
      characterId: crypto.randomUUID(),
      jobId: crypto.randomUUID(),
      candidateIndex: 0,
      bytesBase64: bytes.toString("base64"),
      mimeType: "image/png",
    });

    createdRefs.push(stored.storageRef);
    expect(stored.storageRef.startsWith("s3-character-visual://")).toBe(true);

    const read = await readCharacterVisual(stored.storageRef);
    expect(Buffer.from(read.bytes)).toEqual(bytes);
    expect(read.mimeType).toBe("image/png");

    await deleteCharacterVisual(stored.storageRef);
    createdRefs.splice(createdRefs.indexOf(stored.storageRef), 1);

    await expect(readCharacterVisual(stored.storageRef)).rejects.toThrow(
      "OBJECT_STORAGE_GET_FAILED:404",
    );
  });
});
