import { index, integer, jsonb, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId } from "../common";
import { memorySchema } from "../schemas";
import { worlds } from "../world/worlds";

export const memorySummaries = memorySchema.table(
  "memory_summaries",
  {
    id: primaryId(),
    worldId: uuid("world_id").notNull().references(() => worlds.id, { onDelete: "cascade" }),
    subjectType: varchar("subject_type", { length: 80 }).notNull(),
    subjectId: uuid("subject_id").notNull(),
    summaryLevel: varchar("summary_level", { length: 40 }).notNull().default("recent"),
    sourceMemoryCount: integer("source_memory_count").notNull().default(0),
    summaryText: text("summary_text").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    generatedAt: timestamp("generated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("memory_summaries_subject_idx").on(table.subjectType, table.subjectId, table.generatedAt),
  ],
);
