import { check, integer, jsonb, primaryKey, real, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { simulationSchema } from "../schemas";
import { worlds } from "../world/worlds";

export const simulationPolicies = simulationSchema.table(
  "simulation_policies",
  {
    worldId: uuid("world_id").notNull().references(() => worlds.id, { onDelete: "cascade" }),
    policyCode: varchar("policy_code", { length: 80 }).notNull().default("default"),
    maxCatchUpDays: integer("max_catch_up_days").notNull().default(10),
    fullIntensityDays: integer("full_intensity_days").notNull().default(1),
    minimumIntensity: real("minimum_intensity").notNull().default(0.1),
    freezeAfterLimit: new (require("drizzle-orm/pg-core").boolean)("freeze_after_limit").notNull().default(true),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [
    primaryKey({ columns: [table.worldId], name: "simulation_policies_pk" }),
    check("simulation_policies_max_days_check", sql`${table.maxCatchUpDays} BETWEEN 0 AND 30`),
    check("simulation_policies_full_days_check", sql`${table.fullIntensityDays} BETWEEN 0 AND ${table.maxCatchUpDays}`),
    check("simulation_policies_minimum_intensity_check", sql`${table.minimumIntensity} BETWEEN 0 AND 1`),
  ],
);
