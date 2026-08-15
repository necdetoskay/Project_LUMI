import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { primaryId } from "./common";
import { storySchema } from "./schemas";

const storyChoiceOptionsTable = storySchema.table(
  "story_choice_options",
  {
    id: primaryId(),
    choicePointId: uuid("choice_point_id").notNull(),
    optionKey: varchar("option_key", { length: 120 }).notNull(),
    optionText: varchar("option_text", { length: 1000 }).notNull(),
    sequenceNumber: integer("sequence_number").notNull().default(0),
    availabilityRule: jsonb("availability_rule"),
    consequencePreviews: jsonb("consequence_previews").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("story_choice_option_point_idx").on(table.choicePointId),
    check(
      "story_choice_option_sequence_non_negative_check",
      sql`${table.sequenceNumber} >= 0`,
    ),
  ],
);

// Keep the legacy repository property mapped to the canonical sequence column.
// This prevents Drizzle from emitting an empty ORDER BY while callers migrate
// to sequenceNumber.
export const storyChoiceOptions = Object.assign(storyChoiceOptionsTable, {
  optionOrder: storyChoiceOptionsTable.sequenceNumber,
});

export type StoryChoiceOptionRecord = typeof storyChoiceOptions.$inferSelect;
export type NewStoryChoiceOptionRecord = typeof storyChoiceOptions.$inferInsert;
