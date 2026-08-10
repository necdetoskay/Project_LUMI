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
import { lumiCharacters } from "./lumi-characters";

export const characterVisualGenerationJobs = profileSchema.table(
  "character_visual_generation_jobs",
  {
    id: primaryId(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    characterId: uuid("character_id")
      .notNull()
      .references(() => lumiCharacters.id, { onDelete: "cascade" }),
    idempotencyKey: varchar("idempotency_key", { length: 160 }).notNull(),
    visualBriefVersion: varchar("visual_brief_version", { length: 40 }).notNull(),
    visualBriefFingerprint: varchar("visual_brief_fingerprint", {
      length: 128,
    }).notNull(),
    visualBrief: jsonb("visual_brief").$type<Record<string, unknown>>().notNull(),
    provider: varchar("provider", { length: 80 }),
    model: varchar("model", { length: 160 }),
    requestedCandidateCount: integer("requested_candidate_count")
      .notNull()
      .default(1),
    status: varchar("status", { length: 24 }).notNull().default("pending"),
    providerRequestId: varchar("provider_request_id", { length: 200 }),
    usageMetadata: jsonb("usage_metadata").$type<Record<string, unknown>>(),
    costMetadata: jsonb("cost_metadata").$type<Record<string, unknown>>(),
    errorCode: varchar("error_code", { length: 120 }),
    errorMessage: text("error_message"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("uq_character_visual_generation_job_idempotency").on(
      table.householdId,
      table.characterId,
      table.idempotencyKey,
    ),
    index("character_visual_generation_jobs_character_idx").on(
      table.characterId,
    ),
    check(
      "character_visual_generation_jobs_status_check",
      sql`${table.status} IN ('pending', 'running', 'succeeded', 'failed', 'cancelled')`,
    ),
    check(
      "character_visual_generation_jobs_candidate_count_check",
      sql`${table.requestedCandidateCount} > 0`,
    ),
  ],
);

export const characterVisualAssets = profileSchema.table(
  "character_visual_assets",
  {
    id: primaryId(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    characterId: uuid("character_id")
      .notNull()
      .references(() => lumiCharacters.id, { onDelete: "cascade" }),
    generationJobId: uuid("generation_job_id").references(
      () => characterVisualGenerationJobs.id,
      { onDelete: "set null" },
    ),
    assetKind: varchar("asset_kind", { length: 40 })
      .notNull()
      .default("character_portrait"),
    storageRef: text("storage_ref").notNull(),
    mimeType: varchar("mime_type", { length: 120 }),
    width: integer("width"),
    height: integer("height"),
    provider: varchar("provider", { length: 80 }),
    model: varchar("model", { length: 160 }),
    candidateIndex: integer("candidate_index").notNull().default(0),
    lifecycleState: varchar("lifecycle_state", { length: 24 })
      .notNull()
      .default("candidate"),
    sourceCompositeAssetId: uuid("source_composite_asset_id"),
    cropMetadata: jsonb("crop_metadata").$type<Record<string, unknown>>(),
    provenance: jsonb("provenance").$type<Record<string, unknown>>().notNull(),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestampColumns,
  },
  (table) => [
    index("character_visual_assets_character_idx").on(table.characterId),
    index("character_visual_assets_generation_job_idx").on(table.generationJobId),
    check(
      "character_visual_assets_lifecycle_check",
      sql`${table.lifecycleState} IN ('candidate', 'canonical', 'rejected', 'archived')`,
    ),
    check(
      "character_visual_assets_candidate_index_check",
      sql`${table.candidateIndex} >= 0`,
    ),
  ],
);

export const characterVisualCanons = profileSchema.table(
  "character_visual_canons",
  {
    id: primaryId(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    characterId: uuid("character_id")
      .notNull()
      .references(() => lumiCharacters.id, { onDelete: "cascade" }),
    selectedAssetId: uuid("selected_asset_id").references(
      () => characterVisualAssets.id,
      { onDelete: "set null" },
    ),
    visualBriefVersion: varchar("visual_brief_version", { length: 40 }).notNull(),
    visualBriefFingerprint: varchar("visual_brief_fingerprint", {
      length: 128,
    }).notNull(),
    appearanceTraits: jsonb("appearance_traits")
      .$type<Record<string, unknown>>()
      .notNull(),
    styleProfile: jsonb("style_profile").$type<Record<string, unknown>>().notNull(),
    safetyConstraints: jsonb("safety_constraints")
      .$type<Record<string, unknown>>()
      .notNull(),
    status: varchar("status", { length: 24 }).notNull().default("draft"),
    selectedAt: timestamp("selected_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("uq_character_visual_canons_character").on(table.characterId),
    index("character_visual_canons_household_idx").on(table.householdId),
    check(
      "character_visual_canons_status_check",
      sql`${table.status} IN ('draft', 'selected', 'archived')`,
    ),
  ],
);

export type CharacterVisualGenerationJobRecord =
  typeof characterVisualGenerationJobs.$inferSelect;
export type NewCharacterVisualGenerationJobRecord =
  typeof characterVisualGenerationJobs.$inferInsert;
export type CharacterVisualAssetRecord = typeof characterVisualAssets.$inferSelect;
export type NewCharacterVisualAssetRecord = typeof characterVisualAssets.$inferInsert;
export type CharacterVisualCanonRecord = typeof characterVisualCanons.$inferSelect;
export type NewCharacterVisualCanonRecord = typeof characterVisualCanons.$inferInsert;
