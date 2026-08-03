import { index, primaryKey, real, varchar } from "drizzle-orm/pg-core";
import { timestampColumns } from "../common";
import { profileSchema } from "../schemas";
import { lumiCharacters } from "./lumi-characters";

export const characterRelationships = profileSchema.table(
  "character_relationships",
  {
    characterId: varchar("character_id", { length: 36 })
      .notNull()
      .references(() => lumiCharacters.id, { onDelete: "cascade" }),
    targetCharacterId: varchar("target_character_id", { length: 36 })
      .notNull()
      .references(() => lumiCharacters.id, { onDelete: "cascade" }),
    trust: real("trust").notNull().default(0.5),
    affinity: real("affinity").notNull().default(0.5),
    familiarity: real("familiarity").notNull().default(0),
    relationshipType: varchar("relationship_type", { length: 40 }).notNull().default("neutral"),
    customTypeLabel: varchar("custom_type_label", { length: 120 }),
    ...timestampColumns,
  },
  (table) => ({
    pk: primaryKey({ columns: [table.characterId, table.targetCharacterId] }),
    targetIdx: index("character_relationships_target_idx").on(table.targetCharacterId),
  }),
);

export type CharacterRelationshipRecord = typeof characterRelationships.$inferSelect;
export type NewCharacterRelationshipRecord = typeof characterRelationships.$inferInsert;
