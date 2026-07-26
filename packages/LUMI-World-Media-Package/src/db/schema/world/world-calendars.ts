import {
  check,
  integer,
  jsonb,
  primaryKey,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { worldSchema } from "../schemas";
import { worlds } from "./worlds";

export type CalendarDefinition = {
  months?: Array<{
    code: string;
    name: string;
    days: number;
  }>;
  weekdays?: string[];
};

export const worldCalendars = worldSchema.table(
  "world_calendars",
  {
    worldId: uuid("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    calendarCode: varchar("calendar_code", {
      length: 80,
    }).notNull().default("default"),
    daysPerYear: integer("days_per_year")
      .notNull()
      .default(360),
    hoursPerDay: integer("hours_per_day")
      .notNull()
      .default(24),
    definition: jsonb("definition")
      .$type<CalendarDefinition>()
      .notNull()
      .default({}),
  },
  (table) => [
    primaryKey({
      columns: [table.worldId],
      name: "world_calendars_pk",
    }),
    check(
      "world_calendars_days_per_year_check",
      sql`${table.daysPerYear} BETWEEN 1 AND 10000`,
    ),
    check(
      "world_calendars_hours_per_day_check",
      sql`${table.hoursPerDay} BETWEEN 1 AND 100`,
    ),
  ],
);

export type WorldCalendarRecord =
  typeof worldCalendars.$inferSelect;
export type NewWorldCalendarRecord =
  typeof worldCalendars.$inferInsert;
