import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { primaryId } from "./common";
import { aiSchema } from "./schemas";

export const generationUsage = aiSchema.table(
  "generation_usage",
  {
    id: primaryId(),
    requestId: varchar("request_id", { length: 200 }).notNull(),
    providerId: varchar("provider_id", { length: 80 }).notNull(),
    modelId: varchar("model_id", { length: 200 }).notNull(),
    task: varchar("task", { length: 40 }).notNull(),
    startedAt: timestamp("started_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    latencyMs: integer("latency_ms").notNull().default(0),
    attempt: integer("attempt").notNull().default(1),
    outcome: varchar("outcome", { length: 10 }).notNull(),
    failureState: varchar("failure_state", { length: 40 }),
    validationFindings: jsonb("validation_findings").notNull().default([]),
    costUsd: numeric("cost_usd", { precision: 20, scale: 8 })
      .notNull()
      .default("0"),
    childContent: boolean("child_content").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("gen_usage_request_idx").on(table.requestId),
    index("gen_usage_model_idx").on(table.modelId),
    index("gen_usage_created_idx").on(table.createdAt),
    check(
      "chk_gen_usage_task",
      sql`${table.task} IN ('origin_candidate', 'story_scene', 'story_dialogue', 'choice_proposal', 'reflection_qa')`,
    ),
    check(
      "chk_gen_usage_outcome",
      sql`${table.outcome} IN ('success', 'failed')`,
    ),
    check(
      "chk_gen_usage_tokens",
      sql`${table.inputTokens} >= 0 AND ${table.outputTokens} >= 0 AND ${table.totalTokens} >= 0`,
    ),
  ],
);

export type GenerationUsageRecord = typeof generationUsage.$inferSelect;
export type NewGenerationUsageRecord = typeof generationUsage.$inferInsert;
