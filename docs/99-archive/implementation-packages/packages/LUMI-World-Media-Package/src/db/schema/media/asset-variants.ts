import {
  bigint,
  index,
  jsonb,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { primaryId, timestampColumns } from "../common";
import { mediaSchema } from "../schemas";
import { assets } from "./assets";

export type AssetVariantMetadata = {
  width?: number;
  height?: number;
  bitrate?: number;
  quality?: number;
};

export const assetVariants = mediaSchema.table(
  "asset_variants",
  {
    id: primaryId(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    variantCode: varchar("variant_code", { length: 80 }).notNull(),
    storageKey: varchar("storage_key", { length: 500 }).notNull(),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    metadata: jsonb("metadata")
      .$type<AssetVariantMetadata>()
      .notNull()
      .default({}),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("asset_variants_asset_code_unique").on(
      table.assetId,
      table.variantCode,
    ),
    index("asset_variants_asset_idx").on(table.assetId),
  ],
);

export type AssetVariantRecord = typeof assetVariants.$inferSelect;
export type NewAssetVariantRecord = typeof assetVariants.$inferInsert;
