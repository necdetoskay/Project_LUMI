import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  timestamp,
  unique,
  uniqueIndex,
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
    unique("uq_media_assets_cache_scope").on(
      table.id,
      table.householdId,
      table.childProfileId,
      table.worldId,
      table.fingerprint,
    ),
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
    assetId: uuid("asset_id").notNull(),
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
    foreignKey({
      columns: [
        table.assetId,
        table.householdId,
        table.childProfileId,
        table.worldId,
        table.fingerprint,
      ],
      foreignColumns: [
        mediaAssets.id,
        mediaAssets.householdId,
        mediaAssets.childProfileId,
        mediaAssets.worldId,
        mediaAssets.fingerprint,
      ],
      name: "media_fingerprint_cache_asset_scope_fk",
    }).onDelete("cascade"),
  ],
);

export const storyVisualManifests = mediaSchema.table(
  "story_visual_manifests",
  {
    id: primaryId(),
    householdId: uuid("household_id").notNull(),
    childProfileId: uuid("child_profile_id").notNull(),
    worldId: uuid("world_id").notNull(),
    storyId: uuid("story_id").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    source: varchar("source", { length: 32 }).notNull(),
    manifestFingerprint: varchar("manifest_fingerprint", {
      length: 64,
    }).notNull(),
    manifestJson: jsonb("manifest_json").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("uq_story_visual_manifest_fingerprint").on(
      table.householdId,
      table.storyId,
      table.manifestFingerprint,
    ),
    unique("uq_story_visual_manifest_asset_set_identity").on(
      table.id,
      table.householdId,
      table.childProfileId,
      table.worldId,
      table.storyId,
      table.manifestFingerprint,
    ),
    index("story_visual_manifest_story_idx").on(
      table.householdId,
      table.storyId,
      table.createdAt,
    ),
    check(
      "chk_story_visual_manifest_source",
      sql`${table.source} IN ('story-generation', 'story-edit', 'backfill')`,
    ),
  ],
);

export const storyVisualAssetSets = mediaSchema.table(
  "story_visual_asset_sets",
  {
    id: primaryId(),
    manifestId: uuid("manifest_id").notNull(),
    householdId: uuid("household_id").notNull(),
    childProfileId: uuid("child_profile_id").notNull(),
    worldId: uuid("world_id").notNull(),
    storyId: uuid("story_id").notNull(),
    manifestFingerprint: varchar("manifest_fingerprint", {
      length: 64,
    }).notNull(),
    styleId: varchar("style_id", { length: 120 }).notNull(),
    styleVersion: integer("style_version").notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    active: boolean("active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("story_visual_asset_set_story_idx").on(
      table.householdId,
      table.storyId,
      table.createdAt,
    ),
    uniqueIndex("uq_story_visual_active_asset_set")
      .on(table.householdId, table.storyId)
      .where(sql`${table.active} = true`),
    foreignKey({
      columns: [
        table.manifestId,
        table.householdId,
        table.childProfileId,
        table.worldId,
        table.storyId,
        table.manifestFingerprint,
      ],
      foreignColumns: [
        storyVisualManifests.id,
        storyVisualManifests.householdId,
        storyVisualManifests.childProfileId,
        storyVisualManifests.worldId,
        storyVisualManifests.storyId,
        storyVisualManifests.manifestFingerprint,
      ],
      name: "story_visual_asset_sets_manifest_identity_fk",
    }).onDelete("cascade"),
    check(
      "chk_story_visual_asset_set_status",
      sql`${table.status} IN ('planned', 'generating', 'ready', 'partial', 'failed')`,
    ),
  ],
);

export const storyVisualAssetSetRenders = mediaSchema.table(
  "story_visual_asset_set_renders",
  {
    id: primaryId(),
    assetSetId: uuid("asset_set_id")
      .notNull()
      .references(() => storyVisualAssetSets.id, { onDelete: "cascade" }),
    targetKind: varchar("target_kind", { length: 24 }).notNull(),
    targetId: varchar("target_id", { length: 160 }).notNull(),
    manifestEntityId: varchar("manifest_entity_id", { length: 160 }),
    resolvedEntityId: varchar("resolved_entity_id", { length: 160 }),
    variantId: varchar("variant_id", { length: 160 }),
    stateId: varchar("state_id", { length: 160 }),
    renderFingerprint: varchar("render_fingerprint", { length: 64 }).notNull(),
    assetId: uuid("asset_id").references(() => mediaAssets.id, {
      onDelete: "no action",
    }),
    status: varchar("status", { length: 20 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("uq_story_visual_asset_set_render").on(
      table.assetSetId,
      table.renderFingerprint,
    ),
    index("story_visual_asset_set_render_status_idx").on(
      table.assetSetId,
      table.status,
    ),
    check(
      "chk_story_visual_render_target_kind",
      sql`${table.targetKind} IN ('entity-render', 'story-illustration')`,
    ),
    check(
      "chk_story_visual_render_status",
      sql`${table.status} IN ('planned', 'reused', 'missing', 'generating', 'ready', 'failed')`,
    ),
    check(
      "chk_story_visual_render_ready_asset",
      sql`${table.status} NOT IN ('ready', 'reused') OR ${table.assetId} IS NOT NULL`,
    ),
  ],
);
