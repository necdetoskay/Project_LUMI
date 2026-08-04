import { and, desc, eq } from "drizzle-orm";

import type {
  AssetGenerationMeta,
  AssetScope,
  AssetVariant,
  StoredAsset,
} from "../../../domain/asset";
import type { MediaAssetRepositoryPort } from "../../../ports/repository.port";
import type { QueryExecutor } from "../../client";
import {
  mediaAssetGenerations,
  mediaAssetVariants,
  mediaAssets,
} from "../../schema/media";

type MediaAssetRow = typeof mediaAssets.$inferSelect;

export class DrizzleMediaAssetRepository implements MediaAssetRepositoryPort {
  constructor(private readonly db: QueryExecutor) {}

  async createAsset(asset: StoredAsset): Promise<StoredAsset> {
    const [row] = await this.db
      .insert(mediaAssets)
      .values({
        id: asset.id,
        householdId: asset.scope.householdId,
        childProfileId: asset.scope.childProfileId,
        worldId: asset.scope.worldId,
        kind: asset.kind,
        assetType: asset.assetType,
        mimeType: asset.mimeType,
        storageProvider: asset.storageProvider,
        storageKey: asset.storageKey,
        checksum: asset.checksum,
        byteSize: asset.byteSize,
        width: asset.width,
        height: asset.height,
        durationSeconds: asset.durationSeconds,
        lifecycleStatus: asset.lifecycleStatus,
        fingerprint: asset.fingerprint,
        version: 1,
      })
      .returning();
    return toStoredAsset(row!);
  }

  async getAsset(id: string): Promise<StoredAsset | null> {
    const row = await this.db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, id));
    return row[0] ? toStoredAsset(row[0]) : null;
  }

  async getAssetInScope(
    id: string,
    scope: AssetScope,
  ): Promise<StoredAsset | null> {
    const row = await this.db
      .select()
      .from(mediaAssets)
      .where(
        and(
          eq(mediaAssets.id, id),
          eq(mediaAssets.householdId, scope.householdId),
          eq(mediaAssets.childProfileId, scope.childProfileId),
        ),
      );
    return row[0] ? toStoredAsset(row[0]) : null;
  }

  async listAssetsInScope(
    scope: AssetScope,
    limit = 50,
  ): Promise<StoredAsset[]> {
    const rows = await this.db
      .select()
      .from(mediaAssets)
      .where(
        and(
          eq(mediaAssets.householdId, scope.householdId),
          eq(mediaAssets.childProfileId, scope.childProfileId),
        ),
      )
      .orderBy(desc(mediaAssets.createdAt))
      .limit(limit);
    return rows.map(toStoredAsset);
  }

  async getAssetByFingerprint(
    fingerprint: string,
    scope: AssetScope,
  ): Promise<StoredAsset | null> {
    const row = await this.db
      .select()
      .from(mediaAssets)
      .where(
        and(
          eq(mediaAssets.fingerprint, fingerprint),
          eq(mediaAssets.householdId, scope.householdId),
          eq(mediaAssets.childProfileId, scope.childProfileId),
        ),
      )
      .limit(1);
    return row[0] ? toStoredAsset(row[0]) : null;
  }

  async updateLifecycle(
    id: string,
    status: StoredAsset["lifecycleStatus"],
  ): Promise<StoredAsset | null> {
    const [row] = await this.db
      .update(mediaAssets)
      .set({ lifecycleStatus: status })
      .where(eq(mediaAssets.id, id))
      .returning();
    return row ? toStoredAsset(row) : null;
  }

  async createVariant(variant: AssetVariant): Promise<AssetVariant> {
    const [row] = await this.db
      .insert(mediaAssetVariants)
      .values({
        id: variant.id,
        assetId: variant.assetId,
        variantKey: variant.variantKey,
        storageKey: variant.storageKey,
        width: variant.width,
        height: variant.height,
        mimeType: variant.mimeType,
      })
      .returning();
    return toAssetVariant(row!);
  }

  async createGenerationMeta(
    meta: AssetGenerationMeta,
  ): Promise<AssetGenerationMeta> {
    const [row] = await this.db
      .insert(mediaAssetGenerations)
      .values({
        id: meta.id,
        assetId: meta.assetId,
        providerId: meta.providerId,
        modelId: meta.modelId,
        promptHash: meta.promptHash,
        seed: meta.seed,
        costUsd: meta.costUsd.toString(),
      })
      .returning();
    return toGenerationMeta(row!);
  }
}

type MediaAssetVariantRow = typeof mediaAssetVariants.$inferSelect;
type MediaAssetGenerationRow = typeof mediaAssetGenerations.$inferSelect;

function toStoredAsset(row: MediaAssetRow): StoredAsset {
  return {
    id: row.id,
    kind: row.kind as StoredAsset["kind"],
    assetType: row.assetType as StoredAsset["assetType"],
    mimeType: row.mimeType,
    storageProvider: row.storageProvider,
    storageKey: row.storageKey,
    checksum: row.checksum,
    byteSize: row.byteSize,
    ...(row.width != null ? { width: row.width } : {}),
    ...(row.height != null ? { height: row.height } : {}),
    ...(row.durationSeconds != null
      ? { durationSeconds: row.durationSeconds }
      : {}),
    lifecycleStatus: row.lifecycleStatus as StoredAsset["lifecycleStatus"],
    scope: {
      householdId: row.householdId,
      childProfileId: row.childProfileId,
      worldId: row.worldId,
    },
    fingerprint: row.fingerprint,
    createdAt: row.createdAt,
  };
}

function toAssetVariant(row: MediaAssetVariantRow): AssetVariant {
  return {
    id: row.id,
    assetId: row.assetId,
    variantKey: row.variantKey,
    storageKey: row.storageKey,
    ...(row.width != null ? { width: row.width } : {}),
    ...(row.height != null ? { height: row.height } : {}),
    mimeType: row.mimeType,
  };
}

function toGenerationMeta(row: MediaAssetGenerationRow): AssetGenerationMeta {
  return {
    id: row.id,
    assetId: row.assetId,
    providerId: row.providerId,
    modelId: row.modelId,
    promptHash: row.promptHash,
    seed: row.seed ?? undefined,
    costUsd: Number(row.costUsd),
    createdAt: row.createdAt,
  };
}
