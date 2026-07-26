import { jsonb, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { primaryId, timestampColumns } from "../common";
import { characterSchema } from "../schemas";

export const emotionDefinitions = characterSchema.table(
  "emotion_definitions",
  {
    id: primaryId(),
    code: varchar("code", { length: 80 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestampColumns,
  },
  (table) => [uniqueIndex("emotion_definitions_code_unique").on(table.code)],
);
