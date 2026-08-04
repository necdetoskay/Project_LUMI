import {
  boolean,
  check,
  index,
  integer,
  real,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { primaryId, timestampColumns } from "../common";
import { profileSchema } from "../schemas";
import { households } from "./households";

export const LLM_TASK_TYPES = [
  "character_origin_generation",
  "story_outline_generation",
  "story_turn_generation",
  "safety_review",
  "character_memory_summary",
  "parent_explanation",
] as const;
export type LlmTaskType = (typeof LLM_TASK_TYPES)[number];

export const REASONING_LEVELS = ["low", "medium", "high"] as const;
export type ReasoningLevel = (typeof REASONING_LEVELS)[number];

export const llmTaskModelSettings = profileSchema.table(
  "llm_task_model_settings",
  {
    id: primaryId(),
    userId: varchar("user_id", { length: 128 }).notNull(),
    householdId: varchar("household_id", { length: 128 })
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 40 })
      .notNull()
      .default("openrouter"),
    taskType: varchar("task_type", { length: 60 }).notNull(),
    modelId: text("model_id").notNull(),
    reasoningLevel: varchar("reasoning_level", { length: 20 })
      .notNull()
      .default("medium"),
    temperature: real("temperature").notNull().default(0.8),
    maxOutputTokens: integer("max_output_tokens").notNull().default(1800),
    enabled: boolean("enabled").notNull().default(true),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("uq_llm_task_model_settings_user_household_provider_task").on(
      table.userId,
      table.householdId,
      table.provider,
      table.taskType,
    ),
    index("llm_task_model_settings_household_idx").on(table.householdId),
    index("llm_task_model_settings_task_type_idx").on(table.taskType),
    check(
      "llm_task_model_settings_provider_check",
      sql`${table.provider} IN ('openrouter')`,
    ),
    check(
      "llm_task_model_settings_task_type_check",
      sql`${table.taskType} IN ('character_origin_generation', 'story_outline_generation', 'story_turn_generation', 'safety_review', 'character_memory_summary', 'parent_explanation')`,
    ),
    check(
      "llm_task_model_settings_reasoning_check",
      sql`${table.reasoningLevel} IN ('low', 'medium', 'high')`,
    ),
    check(
      "llm_task_model_settings_temp_check",
      sql`${table.temperature} >= 0 AND ${table.temperature} <= 2`,
    ),
    check(
      "llm_task_model_settings_tokens_check",
      sql`${table.maxOutputTokens} >= 256 AND ${table.maxOutputTokens} <= 8000`,
    ),
  ],
);

export type LlmTaskModelSettingsRecord =
  typeof llmTaskModelSettings.$inferSelect;
export type NewLlmTaskModelSettingsRecord =
  typeof llmTaskModelSettings.$inferInsert;
