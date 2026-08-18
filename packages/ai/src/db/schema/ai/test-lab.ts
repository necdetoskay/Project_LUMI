import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { primaryId } from "./common";
import { aiSchema } from "./schemas";

export const testLabSessions = aiSchema.table(
  "test_lab_sessions",
  {
    id: primaryId(),
    scenarioKey: varchar("scenario_key", { length: 160 }).notNull(),
    mode: varchar("mode", { length: 20 }).notNull().default("manual"),
    activeBranchId: uuid("active_branch_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("test_lab_sessions_scenario_idx").on(table.scenarioKey),
    check(
      "chk_test_lab_session_mode",
      sql`${table.mode} IN ('manual', 'automated')`,
    ),
  ],
);

export const testLabBranches = aiSchema.table(
  "test_lab_branches",
  {
    id: primaryId(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => testLabSessions.id, { onDelete: "cascade" }),
    parentBranchId: uuid("parent_branch_id"),
    forkedFromPhaseId: varchar("forked_from_phase_id", { length: 160 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("test_lab_branches_session_idx").on(table.sessionId),
    index("test_lab_branches_parent_idx").on(table.parentBranchId),
  ],
);

export const testLabStateSnapshots = aiSchema.table(
  "test_lab_state_snapshots",
  {
    id: primaryId(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => testLabSessions.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => testLabBranches.id, { onDelete: "cascade" }),
    parentStateId: uuid("parent_state_id"),
    createdByRunId: uuid("created_by_run_id"),
    value: jsonb("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("test_lab_states_session_branch_idx").on(
      table.sessionId,
      table.branchId,
    ),
    index("test_lab_states_parent_idx").on(table.parentStateId),
  ],
);

export const testLabRuns = aiSchema.table(
  "test_lab_runs",
  {
    id: primaryId(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => testLabSessions.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => testLabBranches.id, { onDelete: "cascade" }),
    phaseId: varchar("phase_id", { length: 160 }).notNull(),
    parentStateId: uuid("parent_state_id")
      .notNull()
      .references(() => testLabStateSnapshots.id),
    status: varchar("status", { length: 20 }).notNull().default("candidate"),
    modelSlug: varchar("model_slug", { length: 240 }),
    pricingSnapshot: jsonb("pricing_snapshot"),
    usageSnapshot: jsonb("usage_snapshot"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("test_lab_runs_phase_idx").on(
      table.sessionId,
      table.branchId,
      table.phaseId,
    ),
    index("test_lab_runs_model_slug_idx").on(table.modelSlug),
    check(
      "chk_test_lab_run_status",
      sql`${table.status} IN ('candidate', 'failed')`,
    ),
    check(
      "chk_test_lab_run_model_pricing_pair",
      sql`(${table.modelSlug} IS NULL AND ${table.pricingSnapshot} IS NULL) OR (${table.modelSlug} IS NOT NULL AND ${table.pricingSnapshot} IS NOT NULL)`,
    ),
    check(
      "chk_test_lab_run_usage_traceable",
      sql`${table.usageSnapshot} IS NULL OR (${table.modelSlug} IS NOT NULL AND ${table.pricingSnapshot} IS NOT NULL)`,
    ),
  ],
);

export const testLabRunCandidates = aiSchema.table(
  "test_lab_run_candidates",
  {
    id: primaryId(),
    runId: uuid("run_id")
      .notNull()
      .references(() => testLabRuns.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => testLabSessions.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => testLabBranches.id, { onDelete: "cascade" }),
    phaseId: varchar("phase_id", { length: 160 }).notNull(),
    ordinal: integer("ordinal").notNull(),
    payload: jsonb("payload").notNull(),
    candidateStateId: uuid("candidate_state_id")
      .notNull()
      .references(() => testLabStateSnapshots.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("test_lab_candidate_state_uq").on(table.candidateStateId),
    uniqueIndex("test_lab_candidate_run_ordinal_uq").on(
      table.runId,
      table.ordinal,
    ),
    index("test_lab_candidates_run_idx").on(table.runId),
    check("chk_test_lab_candidate_ordinal", sql`${table.ordinal} >= 0`),
  ],
);

export const testLabSelections = aiSchema.table(
  "test_lab_selections",
  {
    id: primaryId(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => testLabSessions.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => testLabBranches.id, { onDelete: "cascade" }),
    phaseId: varchar("phase_id", { length: 160 }).notNull(),
    runId: uuid("run_id")
      .notNull()
      .references(() => testLabRuns.id),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => testLabRunCandidates.id),
    selectedStateId: uuid("selected_state_id")
      .notNull()
      .references(() => testLabStateSnapshots.id),
    actor: varchar("actor", { length: 20 }).notNull(),
    strategy: varchar("strategy", { length: 80 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("test_lab_one_selection_per_branch_phase_uq").on(
      table.sessionId,
      table.branchId,
      table.phaseId,
    ),
    index("test_lab_selections_run_idx").on(table.runId),
    index("test_lab_selections_candidate_idx").on(table.candidateId),
    check(
      "chk_test_lab_selection_actor",
      sql`${table.actor} IN ('human', 'automation')`,
    ),
  ],
);

export type TestLabSessionRecord = typeof testLabSessions.$inferSelect;
export type TestLabBranchRecord = typeof testLabBranches.$inferSelect;
export type TestLabStateSnapshotRecord =
  typeof testLabStateSnapshots.$inferSelect;
export type TestLabRunRecord = typeof testLabRuns.$inferSelect;
export type TestLabRunCandidateRecord =
  typeof testLabRunCandidates.$inferSelect;
export type TestLabSelectionRecord = typeof testLabSelections.$inferSelect;
