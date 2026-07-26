import { index, jsonb, real, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId } from "../common";
import { simulationSchema } from "../schemas";
import { worlds } from "../world/worlds";
import { simulationRuns } from "./simulation-runs";

export const simulationEvents = simulationSchema.table(
  "simulation_events",
  {
    id: primaryId(),
    simulationRunId: uuid("simulation_run_id").notNull().references(() => simulationRuns.id, { onDelete: "cascade" }),
    worldId: uuid("world_id").notNull().references(() => worlds.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull(),
    intensity: real("intensity").notNull().default(0.5),
    importance: real("importance").notNull().default(0.5),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("simulation_events_world_time_idx").on(table.worldId, table.occurredAt),
    index("simulation_events_run_idx").on(table.simulationRunId),
  ],
);
