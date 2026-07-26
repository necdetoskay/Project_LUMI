import { check, index, jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId, timestampColumns } from "../common";
import { simulationSchema } from "../schemas";
import { worlds } from "../world/worlds";

export const simulationRuns = simulationSchema.table(
  "simulation_runs",
  {
    id: primaryId(),
    worldId: uuid("world_id").notNull().references(() => worlds.id, { onDelete: "cascade" }),
    runType: varchar("run_type", { length: 40 }).notNull().default("catch_up"),
    status: varchar("status", { length: 40 }).notNull().default("pending"),
    requestedFrom: timestamp("requested_from", { withTimezone: true, mode: "date" }).notNull(),
    requestedTo: timestamp("requested_to", { withTimezone: true, mode: "date" }).notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true, mode: "date" }),
    effectiveTo: timestamp("effective_to", { withTimezone: true, mode: "date" }),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestampColumns,
  },
  (table) => [
    index("simulation_runs_world_created_idx").on(table.worldId, table.createdAt),
    index("simulation_runs_status_idx").on(table.status),
    check("simulation_runs_type_check", sql`${table.runType} IN ('catch_up','scheduled','manual','story_triggered')`),
    check("simulation_runs_status_check", sql`${table.status} IN ('pending','running','completed','failed','skipped')`),
    check("simulation_runs_requested_range_check", sql`${table.requestedTo} >= ${table.requestedFrom}`),
  ],
);

export type SimulationRunRecord = typeof simulationRuns.$inferSelect;
export type NewSimulationRunRecord = typeof simulationRuns.$inferInsert;
