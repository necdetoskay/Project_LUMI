import { index, jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId } from "../common";
import { storySchema } from "../schemas";
import { storySessions } from "./story-sessions";

export const sessionDecisions = storySchema.table(
  "session_decisions",
  {
    id: primaryId(),
    storySessionId: uuid("story_session_id").notNull().references(() => storySessions.id, { onDelete: "cascade" }),
    nodeKey: varchar("node_key", { length: 120 }).notNull(),
    choiceKey: varchar("choice_key", { length: 120 }).notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    contextSnapshot: jsonb("context_snapshot").$type<Record<string, unknown>>().notNull().default({}),
    consequence: jsonb("consequence").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [
    index("session_decisions_session_time_idx").on(table.storySessionId, table.decidedAt),
  ],
);
