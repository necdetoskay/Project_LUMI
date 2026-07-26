import { check, index, jsonb, real, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId } from "../common";
import { memorySchema } from "../schemas";
import { worlds } from "../world/worlds";

export const memories = memorySchema.table(
  "memories",
  {
    id: primaryId(),
    worldId: uuid("world_id").notNull().references(() => worlds.id, { onDelete: "cascade" }),
    memoryType: varchar("memory_type", { length: 80 }).notNull(),
    sourceType: varchar("source_type", { length: 80 }).notNull(),
    sourceId: uuid("source_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull(),
    importance: real("importance").notNull().default(0.5),
    emotionalWeight: real("emotional_weight").notNull().default(0),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("memories_world_time_idx").on(table.worldId, table.occurredAt),
    index("memories_source_idx").on(table.sourceType, table.sourceId),
    check("memories_importance_check", sql`${table.importance} BETWEEN 0 AND 1`),
    check("memories_emotional_weight_check", sql`${table.emotionalWeight} BETWEEN -1 AND 1`),
  ],
);

export type MemoryRecord = typeof memories.$inferSelect;
export type NewMemoryRecord = typeof memories.$inferInsert;
