import { index, integer, jsonb, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId, timestampColumns } from "../common";
import { storySchema } from "../schemas";
import { storyVersions } from "./story-versions";

export const storyNodes = storySchema.table(
  "story_nodes",
  {
    id: primaryId(),
    storyVersionId: uuid("story_version_id").notNull().references(() => storyVersions.id, { onDelete: "cascade" }),
    nodeKey: varchar("node_key", { length: 120 }).notNull(),
    nodeType: varchar("node_type", { length: 40 }).notNull().default("narrative"),
    sequenceOrder: integer("sequence_order"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("story_nodes_version_key_unique").on(table.storyVersionId, table.nodeKey),
    index("story_nodes_version_order_idx").on(table.storyVersionId, table.sequenceOrder),
  ],
);
