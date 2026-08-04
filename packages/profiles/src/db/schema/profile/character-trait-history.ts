import {
  index,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { primaryId } from "../common";
import { profileSchema } from "../schemas";
import { lumiCharacters } from "./lumi-characters";

export const characterTraitHistory = profileSchema.table(
  "character_trait_history",
  {
    id: primaryId(),
    characterId: uuid("character_id")
      .notNull()
      .references(() => lumiCharacters.id, { onDelete: "cascade" }),
    dimension: varchar("dimension", { length: 40 }).notNull(),
    oldValue: real("old_value").notNull(),
    newValue: real("new_value").notNull(),
    evidence: text("evidence").notNull(),
    deltaMagnitude: real("delta_magnitude").notNull(),
    actorHouseholdId: uuid("actor_household_id").notNull(),
    actorUserId: uuid("actor_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    charIdx: index("character_trait_history_char_idx").on(
      table.characterId,
      table.createdAt,
    ),
  }),
);

export type CharacterTraitHistoryRecord =
  typeof characterTraitHistory.$inferSelect;
export type NewCharacterTraitHistoryRecord =
  typeof characterTraitHistory.$inferInsert;
