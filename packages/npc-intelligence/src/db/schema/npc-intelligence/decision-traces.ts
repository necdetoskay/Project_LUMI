import { index, jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId } from "./common";
import { npcIntelligenceSchema } from "./schemas";

export const decisionTraces = npcIntelligenceSchema.table(
  "decision_traces",
  {
    id: primaryId(),
    npcId: uuid("npc_id").notNull(),
    householdId: uuid("household_id").notNull(),
    seed: varchar("seed", { length: 200 }).notNull(),
    selectedCandidateId: varchar("selected_candidate_id", { length: 120 }),
    selectionReason: varchar("selection_reason", { length: 600 }).notNull(),
    contentHash: varchar("content_hash", { length: 64 }).notNull(),
    traceJson: jsonb("trace_json").notNull(),
    decidedAt: timestamp("decided_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("npc_traces_household_idx").on(
      table.householdId,
      table.npcId,
      table.decidedAt,
    ),
    index("npc_traces_npc_idx").on(table.npcId, table.decidedAt),
    index("npc_traces_hash_idx").on(table.contentHash),
  ],
);

export type DecisionTraceRecord = typeof decisionTraces.$inferSelect;
export type NewDecisionTraceRecord = typeof decisionTraces.$inferInsert;
