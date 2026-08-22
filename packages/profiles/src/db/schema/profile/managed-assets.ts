import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { primaryId, timestampColumns } from "../common";
import { profileSchema } from "../schemas";
import { households } from "./households";

export const managedAssets = profileSchema.table(
  "managed_assets",
  {
    id: primaryId(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    subjectType: varchar("subject_type", { length: 32 }).notNull(),
    subjectId: uuid("subject_id").notNull(),
    storySceneId: uuid("story_scene_id"),
    storyVersionId: uuid("story_version_id"),
    storyDefinitionId: uuid("story_definition_id"),
    assetKind: varchar("asset_kind", { length: 64 }).notNull(),
    storageRef: text("storage_ref").notNull(),
    mimeType: varchar("mime_type", { length: 120 }),
    width: integer("width"),
    height: integer("height"),
    provider: varchar("provider", { length: 80 }),
    model: varchar("model", { length: 160 }),
    originType: varchar("origin_type", { length: 24 })
      .notNull()
      .default("generated"),
    lifecycleState: varchar("lifecycle_state", { length: 24 })
      .notNull()
      .default("candidate"),
    sourceSystem: varchar("source_system", { length: 80 }),
    sourceRecordId: uuid("source_record_id"),
    sourceAssetId: uuid("source_asset_id"),
    provenance: jsonb("provenance").$type<Record<string, unknown>>().notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestampColumns,
  },
  (table) => [
    index("managed_assets_subject_idx").on(
      table.householdId,
      table.subjectType,
      table.subjectId,
    ),
    index("managed_assets_storage_ref_idx").on(table.storageRef),
    uniqueIndex("uq_managed_assets_source_record").on(
      table.sourceSystem,
      table.sourceRecordId,
    ),
    uniqueIndex("uq_managed_assets_canon_selection_scope").on(
      table.id,
      table.householdId,
      table.subjectType,
      table.subjectId,
      table.assetKind,
    ),
    check(
      "managed_assets_subject_type_check",
      sql`${table.subjectType} IN ('character', 'npc', 'location', 'item', 'story_scene')`,
    ),
    check(
      "managed_assets_story_scene_typed_check",
      sql`(
        ${table.subjectType} = 'story_scene'
        AND ${table.storySceneId} IS NOT NULL
        AND ${table.storyVersionId} IS NOT NULL
        AND ${table.storyDefinitionId} IS NOT NULL
        AND ${table.subjectId} = ${table.storySceneId}
      ) OR (
        ${table.subjectType} <> 'story_scene'
        AND ${table.storySceneId} IS NULL
        AND ${table.storyVersionId} IS NULL
        AND ${table.storyDefinitionId} IS NULL
      )`,
    ),
    check(
      "managed_assets_origin_type_check",
      sql`${table.originType} IN ('generated', 'uploaded', 'imported', 'derived')`,
    ),
    check(
      "managed_assets_lifecycle_check",
      sql`${table.lifecycleState} IN ('candidate', 'canonical', 'rejected', 'archived')`,
    ),
  ],
);

export const managedAssetCanons = profileSchema.table(
  "managed_asset_canons",
  {
    id: primaryId(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    subjectType: varchar("subject_type", { length: 32 }).notNull(),
    subjectId: uuid("subject_id").notNull(),
    assetKind: varchar("asset_kind", { length: 64 }).notNull(),
    selectedAssetId: uuid("selected_asset_id").references(
      () => managedAssets.id,
      { onDelete: "set null" },
    ),
    status: varchar("status", { length: 24 }).notNull().default("draft"),
    version: integer("version").notNull().default(1),
    selectedAt: timestamp("selected_at", { withTimezone: true }),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("uq_managed_asset_canons_subject_kind").on(
      table.householdId,
      table.subjectType,
      table.subjectId,
      table.assetKind,
    ),
    index("managed_asset_canons_household_idx").on(table.householdId),
    check(
      "managed_asset_canons_subject_type_check",
      sql`${table.subjectType} IN ('character', 'npc', 'location', 'item', 'story_scene')`,
    ),
    check(
      "managed_asset_canons_status_check",
      sql`${table.status} IN ('draft', 'selected', 'archived')`,
    ),
  ],
);

export const managedAssetLifecycleEvents = profileSchema.table(
  "managed_asset_lifecycle_events",
  {
    id: primaryId(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => managedAssets.id, { onDelete: "cascade" }),
    fromState: varchar("from_state", { length: 24 }),
    toState: varchar("to_state", { length: 24 }).notNull(),
    reason: varchar("reason", { length: 120 }),
    actorType: varchar("actor_type", { length: 24 })
      .notNull()
      .default("system"),
    actorUserId: uuid("actor_user_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("managed_asset_lifecycle_events_asset_idx").on(
      table.assetId,
      table.createdAt,
    ),
    check(
      "managed_asset_lifecycle_events_to_state_check",
      sql`${table.toState} IN ('candidate', 'canonical', 'rejected', 'archived')`,
    ),
    check(
      "managed_asset_lifecycle_events_actor_type_check",
      sql`${table.actorType} IN ('parent', 'admin', 'system', 'import')`,
    ),
  ],
);

export type ManagedAssetRecord = typeof managedAssets.$inferSelect;
export type NewManagedAssetRecord = typeof managedAssets.$inferInsert;
export type ManagedAssetCanonRecord = typeof managedAssetCanons.$inferSelect;
export type NewManagedAssetCanonRecord = typeof managedAssetCanons.$inferInsert;
export type ManagedAssetLifecycleEventRecord =
  typeof managedAssetLifecycleEvents.$inferSelect;
