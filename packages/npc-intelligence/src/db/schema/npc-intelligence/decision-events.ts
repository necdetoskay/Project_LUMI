import { index, integer, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId } from "./common";
import { npcIntelligenceSchema } from "./schemas";

export const decisionEvents = npcIntelligenceSchema.table(
  "decision_events",
  {
    id: primaryId(),
    npcId: uuid("npc_id").notNull(),
    householdId: uuid("household_id").notNull(),
    eventType: varchar("event_type", { length: 40 }).notNull(),
    eventVersion: integer("event_version").notNull().default(1),
    aggregateVersion: integer("aggregate_version").notNull().default(1),
    traceId: uuid("trace_id"),
    selectedCandidateId: varchar("selected_candidate_id", { length: 120 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("npc_events_household_idx").on(
      table.householdId,
      table.npcId,
      table.createdAt,
    ),
    index("npc_events_type_idx").on(table.eventType, table.createdAt),
  ],
);

export type DecisionEventRecord = typeof decisionEvents.$inferSelect;
export type NewDecisionEventRecord = typeof decisionEvents.$inferInsert;
