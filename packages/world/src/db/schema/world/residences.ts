import { index, integer, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { profileSchema } from "./schemas";
import { primaryId } from "./common";

export const worldResidences = profileSchema.table(
  "world_residences",
  {
    id: primaryId(),
    worldId: uuid("world_id").notNull(),
    characterId: uuid("character_id").notNull(),
    locationId: uuid("location_id").notNull(),
    homeId: uuid("home_id"),
    residenceType: varchar("residence_type", { length: 20 })
      .notNull()
      .default("primary"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("wr_character_idx").on(table.characterId),
    index("wr_world_idx").on(table.worldId),
    index("wr_location_idx").on(table.locationId),
  ],
);

export type WorldResidenceRecord = typeof worldResidences.$inferSelect;
export type NewWorldResidenceRecord = typeof worldResidences.$inferInsert;
