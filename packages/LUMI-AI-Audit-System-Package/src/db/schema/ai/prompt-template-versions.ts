import { integer, jsonb, text, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId } from "../common";
import { aiSchema } from "../schemas";
import { promptTemplates } from "./prompt-templates";
import { timestamp } from "drizzle-orm/pg-core";

export const promptTemplateVersions = aiSchema.table(
  "prompt_template_versions",
  {
    id: primaryId(),
    promptTemplateId: uuid("prompt_template_id").notNull().references(() => promptTemplates.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    templateText: text("template_text").notNull(),
    schemaVersion: varchar("schema_version", { length: 40 }).notNull().default("1.0"),
    variablesSchema: jsonb("variables_schema").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("prompt_template_versions_unique").on(table.promptTemplateId, table.versionNumber),
  ],
);
