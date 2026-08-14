import { jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId, timestampColumns } from "../common";
import { profileSchema } from "../schemas";
import { childProfiles } from "./child-profiles";
import { households } from "./households";

export type CharacterCreationDirection = "character_first" | "world_first";
export type CharacterCreationStatus = "draft" | "completed" | "abandoned";

export const characterCreationCycles = profileSchema.table("character_creation_cycles", {
  id: primaryId(),
  childProfileId: uuid("child_profile_id").notNull().references(() => childProfiles.id, { onDelete: "cascade" }),
  householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).$type<CharacterCreationStatus>().notNull().default("draft"),
  startDirection: varchar("start_direction", { length: 20 }).$type<CharacterCreationDirection>(),
  currentStep: varchar("current_step", { length: 60 }).notNull().default("start"),
  latestSummary: jsonb("latest_summary").$type<Record<string, unknown>>().notNull().default({}),
  ...timestampColumns,
  completedAt: timestamp("completed_at", { withTimezone: true }),
  abandonedAt: timestamp("abandoned_at", { withTimezone: true }),
});

export const characterCreationSelections = profileSchema.table("character_creation_selections", {
  id: primaryId(),
  cycleId: uuid("cycle_id").notNull().references(() => characterCreationCycles.id, { onDelete: "cascade" }),
  childProfileId: uuid("child_profile_id").notNull().references(() => childProfiles.id, { onDelete: "cascade" }),
  householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  stepKey: varchar("step_key", { length: 60 }).notNull(),
  selectionKey: varchar("selection_key", { length: 100 }).notNull(),
  selectionPayload: jsonb("selection_payload").$type<Record<string, unknown>>().notNull().default({}),
  selectedBy: varchar("selected_by", { length: 20 }).$type<"user" | "system" | "llm">().notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
