import { check, index, primaryKey, real, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { memorySchema } from "../schemas";
import { memories } from "./memories";

export const memoryLinks = memorySchema.table(
  "memory_links",
  {
    sourceMemoryId: uuid("source_memory_id").notNull().references(() => memories.id, { onDelete: "cascade" }),
    targetMemoryId: uuid("target_memory_id").notNull().references(() => memories.id, { onDelete: "cascade" }),
    linkType: varchar("link_type", { length: 60 }).notNull().default("related"),
    strength: real("strength").notNull().default(0.5),
  },
  (table) => [
    primaryKey({ columns: [table.sourceMemoryId, table.targetMemoryId, table.linkType], name: "memory_links_pk" }),
    index("memory_links_target_idx").on(table.targetMemoryId),
    check("memory_links_not_self_check", sql`${table.sourceMemoryId} <> ${table.targetMemoryId}`),
    check("memory_links_strength_check", sql`${table.strength} BETWEEN 0 AND 1`),
  ],
);
