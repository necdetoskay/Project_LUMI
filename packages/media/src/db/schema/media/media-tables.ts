import {
  check,
  index,
  integer,
  numeric,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { primaryId } from "./common";
import { mediaSchema } from "./schemas";

export const mediaAssets = mediaSchema.table(
  "media_assets",
  {
    id: primaryId(),
    householdId: uuid("household_id").notNull(),
    childProfileId: uuid("child_profile_id").notNull(),
    worldId: uuid("world_id").notNull(),
    kind: varchar("kind", { length: 10 }).notNull(),
    assetType: varchar("asset_type", { length: 40 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    storageProvider: varchar("storage_provider", { length: 80 }).notNull(),
    storageKey: varchar("storage_key", { length: 512 }).notNull(),
    checksum: varchar("checksum", { length: 64 }).notNull(),
    byteSize: integer("byte_size").notNull(),
    width: integer("width"),
    height: integer("height"),
    durationSeconds: integer("duration_seconds"),
    lifecycleStatus: varchar("lifecycle_status", { length: 20 })
      .notNull()
      .default("draft"),
    fingerprint: varchar("fingerprint", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    version: integer("version").notNull().default(1),
  },
  (table) => [
    index("media_assets_scope_idx").on(table.householdId, table.assetType),
    index("media_assets_key_idx").on(table.storageKey),
    index("media_assets_fingerprint_idx").on(
      table.householdId,
      table.fingerprint,
    ),
    index("media_assets_lifecycle_idx").on(table.lifecycleStatus),
    check("chk_media_kind", sql`${table.kind} IN ('image', 'audio')`),
    check(
      "chk_media_lifecycle",
      sql`${table.lifecycleStatus} IN ('draft', 'active', 'archived')`,
    ),
    check("chk_media_bytes", sql`${table.byteSize} >= 0`),
  ],
);

export const mediaAssetVariants = mediaSchema.table(
  "media_asset_variants",
  {
    id: primaryId(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "cascade" }),
    variantKey: varchar("variant_key", { length: 40 }).notNull(),
    storageKey: varchar("storage_key", { length: 512 }).notNull(),
    width: integer("width"),
    height: integer("height"),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("uq_media_asset_variant").on(table.assetId, table.variantKey),
  ],
);

export const mediaAssetGenerations = mediaSchema.table(
  "media_asset_generations",
  {
    id: primaryId(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "cascade" }),
    providerId: varchar("provider_id", { length: 80 }).notNull(),
    modelId: varchar("model_id", { length: 200 }).notNull(),
    promptHash: varchar("prompt_hash", { length: 64 }).notNull(),
    seed: varchar("seed", { length: 100 }),
    costUsd: numeric("cost_usd", { precision: 20, scale: 8 })
      .notNull()
      .default("0"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
);

export const mediaAssetReferences = mediaSchema.table(
  "media_asset_references",
  {
    id: primaryId(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "cascade" }),
    referenceType: varchar("reference_type", { length: 40 }).notNull(),
    referenceId: uuid("reference_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
);

export const mediaFingerprintCache = mediaSchema.table(
  "media_fingerprint_cache",
  {
    id: primaryId(),
    fingerprint: varchar("fingerprint", { length: 64 }).notNull(),
    householdId: uuid("household_id").notNull(),
    childProfileId: uuid("child_profile_id").notNull(),
    worldId: uuid("world_id").notNull(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("media_cache_lookup_idx").on(
      table.householdId,
      table.childProfileId,
      table.fingerprint,
    ),
  ],
);
