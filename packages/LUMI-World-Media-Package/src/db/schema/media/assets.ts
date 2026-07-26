import {
  bigint,
  boolean,
  index,
  jsonb,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import {
  primaryId,
  softDeleteColumn,
  timestampColumns,
} from "../common";
import { mediaSchema } from "../schemas";

export type AssetMetadata = {
  width?: number;
  height?: number;
  durationMs?: number;
  checksum?: string;
  provider?: string;
  generationRequestId?: string;
};

export const assets = mediaSchema.table(
  "assets",
  {
    id: primaryId(),
    storageProvider: varchar("storage_provider", {
      length: 40,
    }).notNull(),
    bucket: varchar("bucket", { length: 120 }).notNull(),
    storageKey: varchar("storage_key", { length: 500 }).notNull(),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    assetType: varchar("asset_type", { length: 40 }).notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    isPublic: boolean("is_public").notNull().default(false),
    metadata: jsonb("metadata")
      .$type<AssetMetadata>()
      .notNull()
      .default({}),
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (table) => [
    uniqueIndex("assets_storage_key_unique_active")
      .on(table.storageProvider, table.bucket, table.storageKey)
      .where(sql`${table.deletedAt} IS NULL`),
    index("assets_type_idx").on(table.assetType),
    index("assets_created_at_idx").on(table.createdAt),
  ],
);

export type AssetRecord = typeof assets.$inferSelect;
export type NewAssetRecord = typeof assets.$inferInsert;
