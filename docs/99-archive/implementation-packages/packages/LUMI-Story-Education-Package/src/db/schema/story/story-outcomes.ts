import { jsonb, primaryKey, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { storySchema } from "../schemas";
import { storySessions } from "./story-sessions";

export const storyOutcomes = storySchema.table(
  "story_outcomes",
  {
    storySessionId: uuid("story_session_id").notNull().references(() => storySessions.id, { onDelete: "cascade" }),
    outcomeCode: varchar("outcome_code", { length: 100 }).notNull(),
    summary: varchar("summary", { length: 1000 }),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.storySessionId], name: "story_outcomes_pk" }),
  ],
);
