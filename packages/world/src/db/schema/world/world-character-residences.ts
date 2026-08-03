import { boolean, index, integer, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId } from "./common";
import { profileSchema } from "./schemas";

export const worldCharacterResidences = profileSchema.table(
  "world_character_residences",
  {
    id: primaryId(),
    characterId: uuid("character_id").notNull(),
    worldId: uuid("world_id").notNull(),
    homeId: uuid("home_id").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    residenceType: varchar("residence_type", { length: 20 }).notNull().default("primary"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("wcr_character_idx").on(table.characterId),
    index("wcr_world_idx").on(table.worldId),
  ],
);

export type WorldCharacterResidenceRecord = typeof worldCharacterResidences.$inferSelect;
export type NewWorldCharacterResidenceRecord = typeof worldCharacterResidences.$inferInsert;
