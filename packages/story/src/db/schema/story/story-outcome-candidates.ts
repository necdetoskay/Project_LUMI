import {
  check,
  index,
  integer,
  jsonb,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId } from "./common";
import { storySchema } from "./schemas";

export const storyOutcomeCandidates = storySchema.table(
  "story_outcome_candidates",
  {
    id: primaryId(),
    storySessionId: uuid("story_session_id").notNull(),
    sourceConsequenceId: uuid("source_consequence_id").notNull(),
    candidateSchemaVersion: integer("candidate_schema_version")
      .notNull()
      .default(1),
    payload: jsonb("payload").notNull().default({}),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("story_outcome_candidate_session_idx").on(table.storySessionId),
    index("story_outcome_candidate_consequence_idx").on(
      table.sourceConsequenceId,
    ),
    check(
      "story_outcome_candidate_status_check",
      sql`${table.status} IN ('pending', 'committed', 'rejected', 'superseded')`,
    ),
    check(
      "story_outcome_candidate_schema_version_positive_check",
      sql`${table.candidateSchemaVersion} >= 1`,
    ),
  ],
);

export type StoryOutcomeCandidateRecord =
  typeof storyOutcomeCandidates.$inferSelect;
export type NewStoryOutcomeCandidateRecord =
  typeof storyOutcomeCandidates.$inferInsert;
