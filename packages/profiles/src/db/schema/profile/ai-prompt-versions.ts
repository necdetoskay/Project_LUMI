import { integer, jsonb, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { primaryId, timestampColumns } from "../common";
import { profileSchema } from "../schemas";

export type AiPromptStatus = "draft" | "active" | "archived";
export const aiPromptVersions = profileSchema.table("ai_prompt_versions", {
  id: primaryId(),
  promptKey: varchar("prompt_key", { length: 160 }).notNull(),
  version: integer("version").notNull(),
  status: varchar("status", { length: 20 })
    .$type<AiPromptStatus>()
    .notNull()
    .default("draft"),
  systemTemplate: text("system_template").notNull(),
  userTemplate: text("user_template").notNull(),
  allowedVariables: jsonb("allowed_variables")
    .$type<string[]>()
    .notNull()
    .default([]),
  requiredVariables: jsonb("required_variables")
    .$type<string[]>()
    .notNull()
    .default([]),
  outputSchema: jsonb("output_schema")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  schemaVersion: varchar("schema_version", { length: 40 })
    .notNull()
    .default("v1"),
  providerOverride: varchar("provider_override", { length: 40 }),
  modelOverride: text("model_override"),
  generationConfig: jsonb("generation_config")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  ...timestampColumns,
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});
export type AiPromptVersionRecord = typeof aiPromptVersions.$inferSelect;
