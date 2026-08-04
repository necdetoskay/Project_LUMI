import {
  check,
  index,
  integer,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId } from "./common";
import { simulationSchema } from "./schemas";

export const simulationRuns = simulationSchema.table(
  "simulation_runs",
  {
    id: primaryId(),
    worldId: uuid("world_id").notNull(),
    householdId: uuid("household_id").notNull(),
    childLastSeenAt: timestamp("child_last_seen_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    childAbsentDays: integer("child_absent_days").notNull(),
    timePhase: varchar("time_phase", { length: 20 }).notNull(),
    budgetTokens: integer("budget_tokens").notNull(),
    runHash: varchar("run_hash", { length: 64 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("planned"),
    startedAt: timestamp("started_at", {
      withTimezone: true,
      mode: "date",
    }),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "date",
    }),
    checkpointId: uuid("checkpoint_id"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("sr_world_household_idx").on(
      table.householdId,
      table.worldId,
      table.startedAt,
    ),
    index("sr_run_hash_idx").on(table.runHash),
    check(
      "chk_simulation_run_phase",
      sql`${table.timePhase} IN ('normal','reduced','limited','frozen')`,
    ),
    check(
      "chk_simulation_run_status",
      sql`${table.status} IN ('planned','running','completed','failed')`,
    ),
  ],
);

export type SimulationRunRecord = typeof simulationRuns.$inferSelect;
export type NewSimulationRunRecord = typeof simulationRuns.$inferInsert;
