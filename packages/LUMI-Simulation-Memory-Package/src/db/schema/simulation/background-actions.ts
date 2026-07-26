import { check, index, jsonb, real, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId } from "../common";
import { simulationSchema } from "../schemas";
import { simulationRuns } from "./simulation-runs";
import { characters } from "../character/characters";

export const backgroundActions = simulationSchema.table(
  "background_actions",
  {
    id: primaryId(),
    simulationRunId: uuid("simulation_run_id").notNull().references(() => simulationRuns.id, { onDelete: "cascade" }),
    actorCharacterId: uuid("actor_character_id").references(() => characters.id, { onDelete: "set null" }),
    actionCode: varchar("action_code", { length: 100 }).notNull(),
    relevanceScore: real("relevance_score").notNull().default(0.5),
    utilityScore: real("utility_score").notNull().default(0.5),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: "date" }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "date" }),
    status: varchar("status", { length: 40 }).notNull().default("resolved"),
    context: jsonb("context").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [
    index("background_actions_actor_time_idx").on(table.actorCharacterId, table.scheduledAt),
    index("background_actions_run_idx").on(table.simulationRunId),
    check("background_actions_relevance_check", sql`${table.relevanceScore} BETWEEN 0 AND 1`),
    check("background_actions_utility_check", sql`${table.utilityScore} BETWEEN 0 AND 1`),
    check("background_actions_status_check", sql`${table.status} IN ('planned','resolved','cancelled','failed')`),
  ],
);
