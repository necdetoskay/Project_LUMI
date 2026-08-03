import { index, integer, jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId } from "./common";
import { storySchema } from "./schemas";

export const storyEventStore = storySchema.table(
  "story_event_store",
  {
    id: primaryId(),
    storySessionId: uuid("story_session_id").notNull(),
    eventType: varchar("event_type", { length: 40 }).notNull(),
    eventVersion: integer("event_version").notNull().default(1),
    aggregateVersion: integer("aggregate_version").notNull().default(1),
    actorHouseholdId: uuid("actor_household_id"),
    childProfileId: uuid("child_profile_id"),
    payload: jsonb("payload").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("story_event_session_idx").on(table.storySessionId, table.createdAt),
    index("story_event_type_idx").on(table.eventType),
  ],
);

export type StoryEventStoreRecord = typeof storyEventStore.$inferSelect;
export type NewStoryEventStoreRecord = typeof storyEventStore.$inferInsert;
