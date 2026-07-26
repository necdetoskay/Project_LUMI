import { check, jsonb, primaryKey, real, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { memorySchema } from "../schemas";
import { memories } from "./memories";

export const memoryRelevance = memorySchema.table(
  "memory_relevance",
  {
    memoryId: uuid("memory_id").notNull().references(() => memories.id, { onDelete: "cascade" }),
    contextType: varchar("context_type", { length: 80 }).notNull(),
    contextId: uuid("context_id").notNull(),
    relevanceScore: real("relevance_score").notNull(),
    reason: jsonb("reason").$type<Record<string, unknown>>().notNull().default({}),
    calculatedAt: timestamp("calculated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.memoryId, table.contextType, table.contextId], name: "memory_relevance_pk" }),
    check("memory_relevance_score_check", sql`${table.relevanceScore} BETWEEN 0 AND 1`),
  ],
);
