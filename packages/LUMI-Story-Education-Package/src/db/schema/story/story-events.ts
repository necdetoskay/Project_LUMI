import { index, jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId } from "../common";
import { storySchema } from "../schemas";
import { storySessions } from "./story-sessions";

export const storyEvents = storySchema.table(
  "story_events",
  {
    id: primaryId(),
    storySessionId: uuid("story_session_id").notNull().references(() => storySessions.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 80 }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [
    index("story_events_session_time_idx").on(table.storySessionId, table.occurredAt),
  ],
);
