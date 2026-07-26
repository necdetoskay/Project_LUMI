import { index, jsonb, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId, timestampColumns } from "../common";
import { storySchema } from "../schemas";
import { storyNodes } from "./story-nodes";

export const storyChoices = storySchema.table(
  "story_choices",
  {
    id: primaryId(),
    storyNodeId: uuid("story_node_id").notNull().references(() => storyNodes.id, { onDelete: "cascade" }),
    choiceKey: varchar("choice_key", { length: 120 }).notNull(),
    label: varchar("label", { length: 240 }).notNull(),
    targetNodeKey: varchar("target_node_key", { length: 120 }),
    consequencePreview: varchar("consequence_preview", { length: 500 }),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("story_choices_node_key_unique").on(table.storyNodeId, table.choiceKey),
    index("story_choices_node_idx").on(table.storyNodeId),
  ],
);
