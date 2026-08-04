import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId } from "./common";
import { profileSchema } from "./schemas";

export const worldLocations = profileSchema.table(
  "world_locations",
  {
    id: primaryId(),
    worldId: uuid("world_id").notNull(),
    regionId: uuid("region_id").notNull(),
    locationKey: varchar("location_key", { length: 120 }).notNull(),
    displayName: varchar("display_name", { length: 200 }).notNull(),
    accessibilityStatus: varchar("accessibility_status", { length: 20 })
      .notNull()
      .default("open"),
    locationType: varchar("location_type", { length: 40 }).notNull(),
    occupancyLevel: varchar("occupancy_level", { length: 20 })
      .notNull()
      .default("empty"),
    safetyLevel: varchar("safety_level", { length: 20 })
      .notNull()
      .default("safe"),
    isHome: boolean("is_home").notNull().default(false),
    metadata: jsonb("metadata").notNull().default({}),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_world_location_key").on(table.worldId, table.locationKey),
    index("wl_world_region_idx").on(table.worldId, table.regionId),
    check(
      "wl_accessibility_check",
      sql`${table.accessibilityStatus} IN ('open', 'restricted', 'blocked', 'dangerous')`,
    ),
    check(
      "wl_occupancy_check",
      sql`${table.occupancyLevel} IN ('empty', 'sparse', 'moderate', 'crowded')`,
    ),
    check(
      "wl_safety_check",
      sql`${table.safetyLevel} IN ('safe', 'caution', 'risky', 'dangerous')`,
    ),
  ],
);

export type WorldLocationRecord = typeof worldLocations.$inferSelect;
export type NewWorldLocationRecord = typeof worldLocations.$inferInsert;
