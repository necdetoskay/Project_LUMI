import { check, index, jsonb, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId, timestampColumns } from "../common";
import { educationSchema } from "../schemas";
import { storyVersions } from "../story/story-versions";

export const questions = educationSchema.table(
  "questions",
  {
    id: primaryId(),
    storyVersionId: uuid("story_version_id").references(() => storyVersions.id, { onDelete: "cascade" }),
    questionType: varchar("question_type", { length: 60 }).notNull(),
    prompt: varchar("prompt", { length: 1000 }).notNull(),
    ageBand: varchar("age_band", { length: 40 }),
    expectedAnswer: jsonb("expected_answer").$type<Record<string, unknown>>().notNull().default({}),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestampColumns,
  },
  (table) => [
    index("questions_story_version_idx").on(table.storyVersionId),
    check("questions_type_check", sql`${table.questionType} IN ('comprehension','reflection','emotion','prediction','moral')`),
  ],
);
