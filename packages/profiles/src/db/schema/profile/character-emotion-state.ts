import {
  index,
  primaryKey,
  real,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { profileSchema } from "../schemas";
import { lumiCharacters } from "./lumi-characters";

export const characterEmotionState = profileSchema.table(
  "character_emotion_state",
  {
    characterId: varchar("character_id", { length: 36 })
      .notNull()
      .references(() => lumiCharacters.id, { onDelete: "cascade" }),
    dimension: varchar("dimension", { length: 40 }).notNull(),
    value: real("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.characterId, table.dimension] }),
    charIdx: index("character_emotion_state_char_idx").on(table.characterId),
  }),
);

export type CharacterEmotionStateRecord =
  typeof characterEmotionState.$inferSelect;
export type NewCharacterEmotionStateRecord =
  typeof characterEmotionState.$inferInsert;
