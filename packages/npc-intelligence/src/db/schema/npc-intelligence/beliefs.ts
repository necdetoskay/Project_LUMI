import {
  check,
  index,
  jsonb,
  numeric,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { npcIntelligenceSchema } from "./schemas";
import { primaryId } from "./common";

export const npcBeliefs = npcIntelligenceSchema.table(
  "beliefs",
  {
    id: primaryId(),
    npcId: uuid("npc_id").notNull(),
    householdId: uuid("household_id").notNull(),
    worldId: uuid("world_id"),
    factId: varchar("fact_id", { length: 180 }).notNull(),
    claim: varchar("claim", { length: 300 }).notNull(),
    confidence: numeric("confidence", { precision: 6, scale: 5 }).notNull(),
    source: varchar("source", { length: 40 }).notNull(),
    provenance: jsonb("provenance").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    lastVerifiedAt: timestamp("last_verified_at", {
      withTimezone: true,
      mode: "date",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    status: varchar("status", { length: 20 }).notNull().default("active"),
  },
  (table) => [
    index("npc_beliefs_npc_household_idx").on(table.npcId, table.householdId),
    index("npc_beliefs_world_scope_idx").on(
      table.householdId,
      table.worldId,
      table.npcId,
    ),
    index("npc_beliefs_fact_idx").on(table.householdId, table.factId),
    check(
      "npc_beliefs_confidence_check",
      sql`${table.confidence} >= 0 AND ${table.confidence} <= 1`,
    ),
    check(
      "npc_beliefs_status_check",
      sql`${table.status} IN ('active','stale','expired')`,
    ),
  ],
);

export type NpcBeliefRecord = typeof npcBeliefs.$inferSelect;
export type NewNpcBeliefRecord = typeof npcBeliefs.$inferInsert;
