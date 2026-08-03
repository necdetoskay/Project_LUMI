import { index, integer, jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId } from "./common";
import { profileSchema } from "./schemas";

export const worldEventStore = profileSchema.table(
  "world_event_store",
  {
    id: primaryId(),
    worldId: uuid("world_id").notNull(),
    eventType: varchar("event_type", { length: 30 }).notNull(),
    eventVersion: integer("event_version").notNull().default(1),
    aggregateVersion: integer("aggregate_version").notNull().default(1),
    actorHouseholdId: uuid("actor_household_id"),
    actorUserId: uuid("actor_user_id"),
    payload: jsonb("payload").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("wes_world_event_idx").on(table.worldId, table.createdAt),
    index("wes_created_at_idx").on(table.createdAt),
  ],
);

export type WorldEventStoreRecord = typeof worldEventStore.$inferSelect;
export type NewWorldEventStoreRecord = typeof worldEventStore.$inferInsert;
