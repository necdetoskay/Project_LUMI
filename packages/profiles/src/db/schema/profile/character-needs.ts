import { index, primaryKey, real, timestamp, varchar } from "drizzle-orm/pg-core";
import { profileSchema } from "../schemas";
import { lumiCharacters } from "./lumi-characters";

export const characterNeeds = profileSchema.table(
  "character_needs",
  {
    characterId: varchar("character_id", { length: 36 })
      .notNull()
      .references(() => lumiCharacters.id, { onDelete: "cascade" }),
    needType: varchar("need_type", { length: 40 }).notNull(),
    value: real("value").notNull(),
    decay: real("decay").notNull().default(0.05),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.characterId, table.needType] }),
    charIdx: index("character_needs_char_idx").on(table.characterId),
  }),
);

export type CharacterNeedRecord = typeof characterNeeds.$inferSelect;
export type NewCharacterNeedRecord = typeof characterNeeds.$inferInsert;
