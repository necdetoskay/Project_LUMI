import { index, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { profileSchema } from "./schemas";

export const worldCharacterLocations = profileSchema.table(
  "world_character_locations",
  {
    characterId: uuid("character_id").primaryKey(),
    worldId: uuid("world_id").notNull(),
    locationId: uuid("location_id").notNull(),
    enteredAt: timestamp("entered_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    version: integer("version").notNull().default(1),
  },
  (table) => [
    index("wcl_world_idx").on(table.worldId),
    index("wcl_location_idx").on(table.locationId),
  ],
);

export type WorldCharacterLocationRecord = typeof worldCharacterLocations.$inferSelect;
export type NewWorldCharacterLocationRecord = typeof worldCharacterLocations.$inferInsert;
