import { check, index, integer, jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId } from "./common";
import { profileSchema } from "./schemas";

export const worlds = profileSchema.table(
  "worlds",
  {
    id: primaryId(),
    householdId: uuid("household_id").notNull(),
    childProfileId: uuid("child_profile_id").notNull(),
    characterId: uuid("character_id").notNull(),
    universeSeed: varchar("universe_seed", { length: 120 }).notNull(),
    originSeed: varchar("origin_seed", { length: 120 }).notNull(),
    acceptedCandidateSeed: varchar("accepted_candidate_seed", { length: 120 }).notNull(),
    generatorVersion: varchar("generator_version", { length: 40 }).notNull(),
    vectorVersion: varchar("vector_version", { length: 40 }).notNull(),
    lifecycleStatus: varchar("lifecycle_status", { length: 20 }).notNull().default("active"),
    metadata: jsonb("metadata").notNull().default({}),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("worlds_household_idx").on(table.householdId),
    index("worlds_character_idx").on(table.characterId),
    index("worlds_lifecycle_idx").on(table.lifecycleStatus),
    check("worlds_lifecycle_check", sql`${table.lifecycleStatus} IN ('active', 'paused', 'frozen', 'archived')`),
  ],
);

export type WorldRecord = typeof worlds.$inferSelect;
export type NewWorldRecord = typeof worlds.$inferInsert;
