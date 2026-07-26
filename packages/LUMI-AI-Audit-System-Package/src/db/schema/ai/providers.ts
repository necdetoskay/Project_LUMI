import { boolean, jsonb, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { primaryId, timestampColumns } from "../common";
import { aiSchema } from "../schemas";

export const aiProviders = aiSchema.table(
  "providers",
  {
    id: primaryId(),
    code: varchar("code", { length: 80 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("ai_providers_code_unique").on(table.code),
  ],
);
