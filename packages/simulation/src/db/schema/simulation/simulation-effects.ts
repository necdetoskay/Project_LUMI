import {
  check,
  index,
  jsonb,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId } from "./common";
import { simulationSchema } from "./schemas";

export const simulationEffects = simulationSchema.table(
  "simulation_effects",
  {
    id: primaryId(),
    runId: uuid("run_id").notNull(),
    worldId: uuid("world_id").notNull(),
    householdId: uuid("household_id").notNull(),
    npcId: uuid("npc_id"),
    entityId: uuid("entity_id"),
    effectType: varchar("effect_type", { length: 60 }).notNull(),
    severity: varchar("severity", { length: 20 }).notNull().default("low"),
    payload: jsonb("payload").notNull().default({}),
    evidence: jsonb("evidence").notNull().default({}),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    committedAt: timestamp("committed_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("se_run_idx").on(table.runId),
    index("se_world_household_status_idx").on(
      table.householdId,
      table.worldId,
      table.status,
      table.committedAt,
    ),
    check("chk_sim_effect_status", sql`${table.status} IN ('pending','committed')`),
    check("chk_sim_effect_severity", sql`${table.severity} IN ('low','moderate','high')`),
  ],
);

export type SimulationEffectRecord = typeof simulationEffects.$inferSelect;
export type NewSimulationEffectRecord = typeof simulationEffects.$inferInsert;
