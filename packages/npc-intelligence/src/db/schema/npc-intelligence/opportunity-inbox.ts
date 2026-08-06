import {
  check,
  doublePrecision,
  index,
  jsonb,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId } from "./common";
import { npcIntelligenceSchema } from "./schemas";

export const opportunityInbox = npcIntelligenceSchema.table(
  "opportunity_inbox",
  {
    id: primaryId(),
    householdId: uuid("household_id").notNull(),
    sourceNpcId: uuid("source_npc_id").notNull(),
    childProfileId: uuid("child_profile_id").notNull(),
    opportunityType: varchar("opportunity_type", { length: 40 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("proposed"),
    message: varchar("message", { length: 500 }).notNull(),
    evidence: jsonb("evidence").notNull().default({}),
    score: doublePrecision("score").notNull().default(0),
    reason: varchar("reason", { length: 600 }).notNull().default(""),
    /** Idempotency key: same opportunity never delivered twice. */
    idempotencyKey: varchar("idempotency_key", { length: 200 }).notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    respondedAt: timestamp("responded_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("opp_inbox_child_idx").on(table.householdId, table.childProfileId),
    index("opp_inbox_status_idx").on(table.status, table.expiresAt),
    index("opp_inbox_idempotency_idx").on(
      table.householdId,
      table.idempotencyKey,
    ),
    check(
      "opp_inbox_status_check",
      sql`${table.status} IN ('proposed','accepted','declined','deferred','expired')`,
    ),
  ],
);

export type OpportunityInboxRecord = typeof opportunityInbox.$inferSelect;
export type NewOpportunityInboxRecord = typeof opportunityInbox.$inferInsert;
