import {
  check,
  index,
  integer,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { timestampColumns } from "./common";
import { simulationSchema } from "./schemas";

export const worldClocks = simulationSchema.table(
  "world_clocks",
  {
    worldId: uuid("world_id").primaryKey(),
    householdId: uuid("household_id").notNull(),
    currentDay: integer("current_day").notNull().default(1),
    currentHour: integer("current_hour").notNull().default(7),
    currentMinute: integer("current_minute").notNull().default(0),
    season: varchar("season", { length: 20 }).notNull().default("spring"),
    lastAdvancedAt: timestamp("last_advanced_at", {
      withTimezone: true,
      mode: "date",
    }),
    clockHash: varchar("clock_hash", { length: 64 }).notNull().default(""),
    version: integer("version").notNull().default(1),
    ...timestampColumns,
  },
  (table) => [
    index("wc_household_world_idx").on(table.householdId, table.worldId),
    check(
      "wc_season_check",
      sql`${table.season} IN ('spring','summer','autumn','winter')`,
    ),
  ],
);

export type WorldClockRecord = typeof worldClocks.$inferSelect;
export type NewWorldClockRecord = typeof worldClocks.$inferInsert;
