import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  numeric,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { primaryId } from "./common";
import { npcIntelligenceSchema } from "./schemas";

export const canonicalMemories = npcIntelligenceSchema.table(
  "memories",
  {
    id: primaryId(),
    householdId: uuid("household_id").notNull(),
    worldId: uuid("world_id").notNull(),
    childProfileId: uuid("child_profile_id"),
    ownerType: varchar("owner_type", { length: 20 }).notNull(),
    ownerId: uuid("owner_id").notNull(),
    kind: varchar("kind", { length: 24 }).notNull(),
    summary: varchar("summary", { length: 500 }).notNull(),
    salience: numeric("salience", { precision: 6, scale: 5 }).notNull(),
    confidence: numeric("confidence", { precision: 6, scale: 5 }).notNull(),
    sourceType: varchar("source_type", { length: 32 }).notNull(),
    sourceId: varchar("source_id", { length: 180 }).notNull(),
    storySessionId: uuid("story_session_id"),
    outcomeId: varchar("outcome_id", { length: 180 }),
    effectKey: varchar("effect_key", { length: 240 }).notNull(),
    provenance: jsonb("provenance").$type<string[]>().notNull().default([]),
    lifecycle: varchar("lifecycle", { length: 20 }).notNull().default("durable"),
    supersedesMemoryId: uuid("supersedes_memory_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    lastReinforcedAt: timestamp("last_reinforced_at", {
      withTimezone: true,
      mode: "date",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    archivedAt: timestamp("archived_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    uniqueIndex("npc_memories_effect_scope_uq").on(
      table.householdId,
      table.worldId,
      table.effectKey,
    ),
    index("npc_memories_owner_scope_idx").on(
      table.householdId,
      table.worldId,
      table.ownerType,
      table.ownerId,
    ),
    index("npc_memories_profile_scope_idx").on(
      table.householdId,
      table.worldId,
      table.childProfileId,
    ),
    index("npc_memories_retrieval_idx").on(
      table.householdId,
      table.worldId,
      table.lifecycle,
      table.salience,
      table.createdAt,
    ),
    check(
      "npc_memories_salience_check",
      sql`${table.salience} >= 0 AND ${table.salience} <= 1`,
    ),
    check(
      "npc_memories_confidence_check",
      sql`${table.confidence} >= 0 AND ${table.confidence} <= 1`,
    ),
    check(
      "npc_memories_owner_type_check",
      sql`${table.ownerType} IN ('character','npc','profile')`,
    ),
    check(
      "npc_memories_lifecycle_check",
      sql`${table.lifecycle} IN ('durable','decaying','superseded','archived')`,
    ),
  ],
);

export type CanonicalMemoryRecord = typeof canonicalMemories.$inferSelect;
export type NewCanonicalMemoryRecord = typeof canonicalMemories.$inferInsert;
