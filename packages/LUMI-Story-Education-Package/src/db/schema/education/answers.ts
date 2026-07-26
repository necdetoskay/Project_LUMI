import { index, jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId } from "../common";
import { educationSchema } from "../schemas";
import { questions } from "./questions";
import { storySessions } from "../story/story-sessions";
import { childProfiles } from "../profile/child-profiles";

export const answers = educationSchema.table(
  "answers",
  {
    id: primaryId(),
    questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
    storySessionId: uuid("story_session_id").notNull().references(() => storySessions.id, { onDelete: "cascade" }),
    childProfileId: uuid("child_profile_id").notNull().references(() => childProfiles.id, { onDelete: "restrict" }),
    answerText: varchar("answer_text", { length: 4000 }),
    answerPayload: jsonb("answer_payload").$type<Record<string, unknown>>().notNull().default({}),
    answeredAt: timestamp("answered_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("answers_session_idx").on(table.storySessionId),
    index("answers_child_idx").on(table.childProfileId),
  ],
);
