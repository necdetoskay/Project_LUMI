import { jsonb, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { primaryId, timestampColumns } from "../common";
import { characterSchema } from "../schemas";

export const relationshipDimensions = characterSchema.table(
  "relationship_dimensions",
  {
    id: primaryId(),
    code: varchar("code", { length: 80 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestampColumns,
  },
  (table) => [uniqueIndex("relationship_dimensions_code_unique").on(table.code)],
);
