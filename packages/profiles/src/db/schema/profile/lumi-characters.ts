import {
  check,
  index,
  integer,
  jsonb,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import type {
  SafetyBounds,
  StoryPreferenceMetadata,
} from "../../../domain/types";
import { primaryId, softDeleteColumn, timestampColumns } from "../common";
import { profileSchema } from "../schemas";
import { childProfiles } from "./child-profiles";
import { households } from "./households";

export const lumiCharacters = profileSchema.table(
  "lumi_characters",
  {
    id: primaryId(),
    childProfileId: uuid("child_profile_id")
      .notNull()
      .references(() => childProfiles.id, { onDelete: "cascade" }),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    broadKind: varchar("broad_kind", { length: 40 }).notNull(),
    characterType: varchar("character_type", { length: 40 }).notNull(),
    subtype: varchar("subtype", { length: 80 }).notNull(),
    originMode: varchar("origin_mode", { length: 20 }).notNull(),
    firstOriginPackageId: uuid("first_origin_package_id").notNull(),
    originConcept: varchar("origin_concept", { length: 500 }).notNull(),
    startingRegionArchetype: varchar("starting_region_archetype", {
      length: 120,
    }).notNull(),
    startingLocation: varchar("starting_location", { length: 200 }).notNull(),
    homeArchetype: varchar("home_archetype", { length: 120 }).notNull(),
    nearbyNpcSeed: varchar("nearby_npc_seed", { length: 500 }).notNull(),
    firstMysterySeed: varchar("first_mystery_seed", { length: 500 }).notNull(),
    universeSeed: varchar("universe_seed", { length: 120 }).notNull(),
    safetyBounds: jsonb("safety_bounds").$type<SafetyBounds>().notNull(),
    preferenceHints: jsonb("preference_hints").$type<StoryPreferenceMetadata>(),
    characterSubtype: varchar("character_subtype", { length: 20 })
      .notNull()
      .default("child_avatar"),
    lifecycleStage: varchar("lifecycle_stage", { length: 20 })
      .notNull()
      .default("childhood"),
    activeLocationId: uuid("active_location_id"),
    activeLocationType: varchar("active_location_type", { length: 40 }),
    version: integer("version").notNull().default(1),
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (table) => [
    index("lumi_characters_household_idx").on(table.householdId),
    index("lumi_characters_child_profile_idx").on(table.childProfileId),
    check(
      "lumi_characters_origin_mode_check",
      sql`${table.originMode} IN ('manual', 'auto')`,
    ),
    check(
      "lumi_characters_broad_kind_check",
      sql`${table.broadKind} IN ('human', 'animal', 'fantasy', 'robot', 'sea_creature', 'sky_creature')`,
    ),
    check(
      "lumi_characters_type_check",
      sql`${table.characterType} IN ('explorer', 'inventor', 'storyteller', 'helper', 'dreamer')`,
    ),
    check(
      "lumi_characters_subtype_check",
      sql`${table.characterSubtype} IN ('child_avatar', 'npc')`,
    ),
    check(
      "lumi_characters_lifecycle_check",
      sql`${table.lifecycleStage} IN ('newborn', 'childhood', 'adolescence', 'adulthood', 'elder')`,
    ),
  ],
);

export type LumiCharacterRecord = typeof lumiCharacters.$inferSelect;
export type NewLumiCharacterRecord = typeof lumiCharacters.$inferInsert;
