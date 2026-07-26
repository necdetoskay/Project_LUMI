import { boolean, index, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { primaryId, timestampColumns } from "../common";
import { aiSchema } from "../schemas";

export const promptTemplates = aiSchema.table(
  "prompt_templates",
  {
    id: primaryId(),
    code: varchar("code", { length: 120 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    domain: varchar("domain", { length: 80 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("prompt_templates_code_unique").on(table.code),
    index("prompt_templates_domain_idx").on(table.domain),
  ],
);
