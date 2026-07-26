import type { QueryExecutor } from "../../db/transaction";
import {
  mediaAssets,
  mediaRequests,
  storyMediaAttachments,
} from "../../db/schema";
import { eq } from "drizzle-orm";
import type { StoredAsset } from "../storage/storage-provider.types";

export async function persistMediaAsset(
  tx: QueryExecutor,
  input: {
    mediaRequestId: string;
    storedAsset: StoredAsset;
    providerCode: string;
    modelCode: string;
    actualCostTry: number;
    width?: number;
    height?: number;
    durationMs?: number;
    storyId?: string;
    storyNodeId?: string;
    attachmentRole?: string;
  },
) {
  const [asset] = await tx
    .insert(mediaAssets)
    .values({
      mediaRequestId:
        input.mediaRequestId,
      storageProviderCode:
        "configured",
      storageKey:
        input.storedAsset.key,
      url: input.storedAsset.url,
      mimeType:
        input.storedAsset.mimeType,
      sizeBytes:
        input.storedAsset.sizeBytes,
      width: input.width,
      height: input.height,
      durationMs:
        input.durationMs,
      providerCode:
        input.providerCode,
      modelCode:
        input.modelCode,
      actualCostTry:
        input.actualCostTry,
      status: "ready",
    })
    .returning();

  if (!asset) {
    throw new Error(
      "Media asset could not be created",
    );
  }

  await tx
    .update(mediaRequests)
    .set({
      status: "ready",
      actualCostTry:
        input.actualCostTry,
      providerCode:
        input.providerCode,
      modelCode:
        input.modelCode,
      completedAt:
        new Date(),
    })
    .where(
      eq(
        mediaRequests.id,
        input.mediaRequestId,
      ),
    );

  if (input.storyId) {
    await tx
      .insert(storyMediaAttachments)
      .values({
        storyId: input.storyId,
        storyNodeId:
          input.storyNodeId,
        mediaAssetId: asset.id,
        attachmentRole:
          input.attachmentRole ??
          "primary",
      });
  }

  return asset;
}
