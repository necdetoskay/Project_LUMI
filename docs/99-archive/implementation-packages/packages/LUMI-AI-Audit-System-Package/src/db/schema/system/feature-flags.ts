import { boolean, jsonb, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { primaryId, timestampColumns } from "../common";
import { systemSchema } from "../schemas";

export const featureFlags = systemSchema.table(
  "feature_flags",
  {
    id: primaryId(),
    code: varchar("code", { length: 120 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    isEnabled: boolean("is_enabled").notNull().default(false),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("feature_flags_code_unique").on(table.code),
  ],
);
