import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { primaryId, timestampColumns } from "../common";
import { profileSchema } from "../schemas";
import { households } from "./households";

export const imageGenerationJobs = profileSchema.table(
  "image_generation_jobs",
  {
    id: primaryId(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    subjectType: varchar("subject_type", { length: 32 }).notNull(),
    subjectId: uuid("subject_id").notNull(),
    assetKind: varchar("asset_kind", { length: 64 }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 160 }).notNull(),
    promptFingerprint: varchar("prompt_fingerprint", { length: 128 }).notNull(),
    requestedCandidateCount: integer("requested_candidate_count").notNull(),
    strategy: varchar("strategy", { length: 24 }).notNull(),
    provider: varchar("provider", { length: 80 }).notNull(),
    model: varchar("model", { length: 160 }).notNull(),
    aspectRatio: varchar("aspect_ratio", { length: 16 }).notNull(),
    resolution: varchar("resolution", { length: 16 }).notNull(),
    providerRequestCount: integer("provider_request_count").notNull(),
    estimatedCostUsd: numeric("estimated_cost_usd", {
      precision: 12,
      scale: 6,
    }).notNull(),
    actualCostUsd: numeric("actual_cost_usd", { precision: 12, scale: 6 }),
    budgetCapUsd: numeric("budget_cap_usd", {
      precision: 12,
      scale: 6,
    }).notNull(),
    pricingBasis: varchar("pricing_basis", { length: 200 }).notNull(),
    status: varchar("status", { length: 24 }).notNull().default("planned"),
    providerRequestId: varchar("provider_request_id", { length: 200 }),
    usageMetadata: jsonb("usage_metadata")
      .$type<Record<string, unknown>>()
      .notNull(),
    costMetadata: jsonb("cost_metadata")
      .$type<Record<string, unknown>>()
      .notNull(),
    planMetadata: jsonb("plan_metadata")
      .$type<Record<string, unknown>>()
      .notNull(),
    errorCode: varchar("error_code", { length: 120 }),
    errorMessage: text("error_message"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("uq_image_generation_jobs_idempotency").on(
      table.householdId,
      table.subjectType,
      table.subjectId,
      table.assetKind,
      table.idempotencyKey,
    ),
    index("image_generation_jobs_subject_idx").on(
      table.householdId,
      table.subjectType,
      table.subjectId,
      table.createdAt,
    ),
    index("image_generation_jobs_status_idx").on(table.status, table.createdAt),
    check(
      "image_generation_jobs_subject_type_check",
      sql`${table.subjectType} IN ('character', 'npc', 'location', 'item', 'story_scene')`,
    ),
    check(
      "image_generation_jobs_candidate_count_check",
      sql`${table.requestedCandidateCount} BETWEEN 1 AND 4`,
    ),
    check(
      "image_generation_jobs_strategy_check",
      sql`${table.strategy} IN ('direct', 'native_batch', 'grid')`,
    ),
    check(
      "image_generation_jobs_status_check",
      sql`${table.status} IN ('planned', 'running', 'succeeded', 'failed')`,
    ),
    check(
      "image_generation_jobs_provider_request_count_check",
      sql`${table.providerRequestCount} >= 1`,
    ),
    check(
      "image_generation_jobs_estimated_cost_check",
      sql`${table.estimatedCostUsd} >= 0`,
    ),
    check(
      "image_generation_jobs_actual_cost_check",
      sql`${table.actualCostUsd} IS NULL OR ${table.actualCostUsd} >= 0`,
    ),
    check(
      "image_generation_jobs_budget_cap_check",
      sql`${table.budgetCapUsd} >= 0`,
    ),
  ],
);

export const imageGenerationCostEvents = profileSchema.table(
  "image_generation_cost_events",
  {
    id: primaryId(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    generationJobId: uuid("generation_job_id")
      .notNull()
      .references(() => imageGenerationJobs.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 24 }).notNull(),
    amountUsd: numeric("amount_usd", { precision: 12, scale: 6 }).notNull(),
    provider: varchar("provider", { length: 80 }).notNull(),
    model: varchar("model", { length: 160 }).notNull(),
    pricingBasis: varchar("pricing_basis", { length: 200 }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("image_generation_cost_events_job_idx").on(
      table.generationJobId,
      table.createdAt,
    ),
    index("image_generation_cost_events_household_idx").on(
      table.householdId,
      table.createdAt,
    ),
    check(
      "image_generation_cost_events_type_check",
      sql`${table.eventType} IN ('estimated', 'actual', 'adjustment')`,
    ),
    check(
      "image_generation_cost_events_amount_check",
      sql`${table.amountUsd} >= 0`,
    ),
  ],
);

export type ImageGenerationJobRecord = typeof imageGenerationJobs.$inferSelect;
export type NewImageGenerationJobRecord =
  typeof imageGenerationJobs.$inferInsert;
export type ImageGenerationCostEventRecord =
  typeof imageGenerationCostEvents.$inferSelect;
