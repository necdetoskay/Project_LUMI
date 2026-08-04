import {
  boolean,
  index,
  jsonb,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { primaryId } from "./common";
import { simulationSchema } from "./schemas";

export const scheduledEvents = simulationSchema.table(
  "scheduled_events",
  {
    id: primaryId(),
    worldId: uuid("world_id").notNull(),
    householdId: uuid("household_id").notNull(),
    scheduledAt: timestamp("scheduled_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    eventType: varchar("event_type", { length: 60 }).notNull(),
    critical: boolean("critical").notNull().default(false),
    playerPreserved: boolean("player_preserved").notNull().default(false),
    payload: jsonb("payload").notNull().default({}),
    resolved: boolean("resolved").notNull().default(false),
    resolvedAt: timestamp("resolved_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("se_world_scheduled_idx").on(
      table.householdId,
      table.worldId,
      table.scheduledAt,
    ),
    index("se_world_unresolved_idx").on(
      table.householdId,
      table.worldId,
      table.resolved,
      table.scheduledAt,
    ),
  ],
);

export type ScheduledEventRecord = typeof scheduledEvents.$inferSelect;
export type NewScheduledEventRecord = typeof scheduledEvents.$inferInsert;
