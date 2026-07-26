import { index, jsonb, real, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId } from "../common";
import { educationSchema } from "../schemas";
import { childProfiles } from "../profile/child-profiles";
import { storySessions } from "../story/story-sessions";

export const learningObservations = educationSchema.table(
  "learning_observations",
  {
    id: primaryId(),
    childProfileId: uuid("child_profile_id").notNull().references(() => childProfiles.id, { onDelete: "cascade" }),
    storySessionId: uuid("story_session_id").references(() => storySessions.id, { onDelete: "set null" }),
    observationCode: varchar("observation_code", { length: 100 }).notNull(),
    score: real("score"),
    evidence: jsonb("evidence").$type<Record<string, unknown>>().notNull().default({}),
    observedAt: timestamp("observed_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("learning_observations_child_time_idx").on(table.childProfileId, table.observedAt),
  ],
);
