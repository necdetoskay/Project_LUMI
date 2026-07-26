import { check, index, primaryKey, real, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { characterSchema } from "../schemas";
import { characters } from "./characters";
import { traitDefinitions } from "./trait-definitions";

export const characterTraits = characterSchema.table(
  "character_traits",
  {
    characterId: uuid("character_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
    traitDefinitionId: uuid("trait_definition_id").notNull().references(() => traitDefinitions.id, { onDelete: "restrict" }),
    value: real("value").notNull(),
    confidence: real("confidence").notNull().default(0.5),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.characterId, table.traitDefinitionId], name: "character_traits_pk" }),
    index("character_traits_trait_idx").on(table.traitDefinitionId),
    check("character_traits_value_check", sql`${table.value} BETWEEN 0 AND 1`),
    check("character_traits_confidence_check", sql`${table.confidence} BETWEEN 0 AND 1`),
  ],
);
