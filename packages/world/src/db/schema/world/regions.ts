import {
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

export const worldRegions = profileSchema.table(
  "world_regions",
  {
    id: primaryId(),
    worldId: uuid("world_id").notNull(),
    regionKey: varchar("region_key", { length: 120 }).notNull(),
    displayName: varchar("display_name", { length: 200 }).notNull(),
    regionType: varchar("region_type", { length: 40 }).notNull(),
    accessibilityStatus: varchar("accessibility_status", { length: 20 })
      .notNull()
      .default("open"),
    discoveryStatus: varchar("discovery_status", { length: 20 })
      .notNull()
      .default("unknown"),
    environmentVector: jsonb("environment_vector").notNull().default({}),
    subregionOf: uuid("subregion_of"),
    sortOrder: integer("sort_order").notNull().default(0),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_world_region_key").on(table.worldId, table.regionKey),
    index("wr_world_idx").on(table.worldId, table.sortOrder),
    check(
      "wr_accessibility_check",
      sql`${table.accessibilityStatus} IN ('open', 'restricted', 'blocked', 'dangerous')`,
    ),
    check(
      "wr_discovery_check",
      sql`${table.discoveryStatus} IN ('unknown', 'rumored', 'discovered', 'explored')`,
    ),
    check(
      "wr_region_type_check",
      sql`${table.regionType} IN ('wilderness', 'settlement', 'water', 'mountain', 'forest', 'sky', 'underground', 'magical', 'urban', 'coastal', 'island', 'custom')`,
    ),
  ],
);

export type WorldRegionRecord = typeof worldRegions.$inferSelect;
export type NewWorldRegionRecord = typeof worldRegions.$inferInsert;
