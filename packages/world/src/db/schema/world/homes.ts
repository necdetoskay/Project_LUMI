import { check, index, integer, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId } from "./common";
import { profileSchema } from "./schemas";

export const worldHomes = profileSchema.table(
  "world_homes",
  {
    id: primaryId(),
    worldId: uuid("world_id").notNull(),
    locationId: uuid("location_id").notNull(),
    homeType: varchar("home_type", { length: 20 }).notNull().default("permanent"),
    displayName: varchar("display_name", { length: 200 }).notNull(),
    residenceType: varchar("residence_type", { length: 20 }).notNull().default("primary"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("wh_world_idx").on(table.worldId),
    index("wh_location_idx").on(table.locationId),
    check("wh_home_type_check", sql`${table.homeType} IN ('permanent', 'temporary', 'safe_haven')`),
    check("wh_residence_type_check", sql`${table.residenceType} IN ('primary', 'secondary', 'guest')`),
  ],
);

export type WorldHomeRecord = typeof worldHomes.$inferSelect;
export type NewWorldHomeRecord = typeof worldHomes.$inferInsert;
