import { check, index, integer, jsonb, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { primaryId, timestampColumns } from "./common";
import { promptsSchema } from "./schemas";

export const promptVersions = promptsSchema.table(
  "prompt_versions",
  {
    id: primaryId(),
    registryId: uuid("registry_id").notNull(),
    versionNumber: integer("version_number").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    templateBody: text("template_body").notNull(),
    variableSchema: jsonb("variable_schema").notNull().default([]),
    modelPreferences: jsonb("model_preferences").notNull().default({}),
    outputSchema: jsonb("output_schema").notNull().default({}),
    ...timestampColumns,
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
    archivedAt: timestamp("archived_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("prompt_ver_registry_idx").on(table.registryId),
    check(
      "chk_prompt_version_status",
      sql`${table.status} IN ('draft', 'published', 'archived')`,
    ),
  ],
);

export type PromptVersionRecord = typeof promptVersions.$inferSelect;
export type NewPromptVersionRecord = typeof promptVersions.$inferInsert;
