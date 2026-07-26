import { check, index, jsonb, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId, timestampColumns } from "../common";
import { characterSchema } from "../schemas";
import { characters } from "./characters";

export const relationships = characterSchema.table(
  "relationships",
  {
    id: primaryId(),
    sourceCharacterId: uuid("source_character_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
    targetCharacterId: uuid("target_character_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
    relationshipType: varchar("relationship_type", { length: 60 }).notNull().default("acquaintance"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("relationships_source_target_unique").on(table.sourceCharacterId, table.targetCharacterId),
    index("relationships_target_idx").on(table.targetCharacterId),
    check("relationships_not_self_check", sql`${table.sourceCharacterId} <> ${table.targetCharacterId}`),
  ],
);
