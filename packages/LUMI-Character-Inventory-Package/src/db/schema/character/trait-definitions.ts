import { check, jsonb, real, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId, timestampColumns } from "../common";
import { characterSchema } from "../schemas";

export const traitDefinitions = characterSchema.table(
  "trait_definitions",
  {
    id: primaryId(),
    code: varchar("code", { length: 80 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    minimumValue: real("minimum_value").notNull().default(0),
    maximumValue: real("maximum_value").notNull().default(1),
    defaultValue: real("default_value").notNull().default(0.5),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("trait_definitions_code_unique").on(table.code),
    check("trait_definitions_range_check", sql`${table.minimumValue} < ${table.maximumValue}`),
    check("trait_definitions_default_check", sql`${table.defaultValue} BETWEEN ${table.minimumValue} AND ${table.maximumValue}`),
  ],
);
