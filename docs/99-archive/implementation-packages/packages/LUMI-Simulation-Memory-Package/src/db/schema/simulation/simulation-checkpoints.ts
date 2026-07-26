import { index, jsonb, timestamp, uuid } from "drizzle-orm/pg-core";
import { primaryId } from "../common";
import { simulationSchema } from "../schemas";
import { worlds } from "../world/worlds";
import { simulationRuns } from "./simulation-runs";

export const simulationCheckpoints = simulationSchema.table(
  "simulation_checkpoints",
  {
    id: primaryId(),
    worldId: uuid("world_id").notNull().references(() => worlds.id, { onDelete: "cascade" }),
    simulationRunId: uuid("simulation_run_id").references(() => simulationRuns.id, { onDelete: "set null" }),
    checkpointAt: timestamp("checkpoint_at", { withTimezone: true, mode: "date" }).notNull(),
    cursor: jsonb("cursor").$type<Record<string, unknown>>().notNull().default({}),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("simulation_checkpoints_world_time_idx").on(table.worldId, table.checkpointAt),
  ],
);
