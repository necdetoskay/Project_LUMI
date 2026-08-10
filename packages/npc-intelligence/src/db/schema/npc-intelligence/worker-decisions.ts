import { index, jsonb, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { npcIntelligenceSchema } from "./schemas";
import { primaryId } from "./common";

export const workerNpcDecisions = npcIntelligenceSchema.table(
  "worker_npc_decisions",
  {
    id: primaryId(),
    householdId: uuid("household_id").notNull(),
    worldId: uuid("world_id").notNull(),
    childProfileId: uuid("child_profile_id").notNull(),
    npcId: uuid("npc_id").notNull(),
    decisionKey: varchar("decision_key", { length: 128 }).notNull(),
    selectedCandidateId: varchar("selected_candidate_id", { length: 255 }),
    usedMemoryIds: jsonb("used_memory_ids").$type<string[]>().notNull().default([]),
    resultJson: jsonb("result_json").$type<Record<string, unknown>>().notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    uniqueIndex("worker_npc_decisions_scope_key_uidx").on(
      table.householdId,
      table.worldId,
      table.childProfileId,
      table.npcId,
      table.decisionKey,
    ),
    index("worker_npc_decisions_scope_idx").on(
      table.householdId,
      table.worldId,
      table.childProfileId,
      table.npcId,
      table.decidedAt,
    ),
  ],
);

export type WorkerNpcDecisionRecord = typeof workerNpcDecisions.$inferSelect;
