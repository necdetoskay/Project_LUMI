import { check, jsonb, primaryKey, real, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { simulationSchema } from "../schemas";
import { worlds } from "../world/worlds";

export const entityTimeProfiles = simulationSchema.table(
  "entity_time_profiles",
  {
    worldId: uuid("world_id").notNull().references(() => worlds.id, { onDelete: "cascade" }),
    entityType: varchar("entity_type", { length: 80 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    baseTimeSensitivity: real("base_time_sensitivity").notNull().default(0.5),
    currentPriority: real("current_priority").notNull().default(0.5),
    lastSimulatedAt: timestamp("last_simulated_at", { withTimezone: true, mode: "date" }),
    nextRelevantAt: timestamp("next_relevant_at", { withTimezone: true, mode: "date" }),
    profile: jsonb("profile").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [
    primaryKey({ columns: [table.worldId, table.entityType, table.entityId], name: "entity_time_profiles_pk" }),
    check("entity_time_profiles_sensitivity_check", sql`${table.baseTimeSensitivity} BETWEEN 0 AND 1`),
    check("entity_time_profiles_priority_check", sql`${table.currentPriority} BETWEEN 0 AND 1`),
  ],
);
