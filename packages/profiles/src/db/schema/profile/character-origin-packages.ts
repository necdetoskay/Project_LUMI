import {
  boolean,
  index,
  jsonb,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import type {
  OriginMode,
  SafetyBounds,
  StoryPreferenceMetadata,
  ToneVector,
} from "../../../domain/types";
import { primaryId, timestampColumns } from "../common";
import { profileSchema } from "../schemas";
import { childProfiles } from "./child-profiles";
import { households } from "./households";

export type OriginPackagePayload = {
  originConcept: string;
  startingRegionArchetype: string;
  startingLocation: string;
  homeArchetype: string;
  nearbyNpcSeed: string;
  firstMysterySeed: string;
  toneVector: ToneVector[];
  noveltyMarkers: string[];
  safetyBounds: SafetyBounds;
  preferenceHints?: StoryPreferenceMetadata;
};

export const characterOriginPackages = profileSchema.table(
  "character_origin_packages",
  {
    id: primaryId(),
    childProfileId: uuid("child_profile_id")
      .notNull()
      .references(() => childProfiles.id, { onDelete: "cascade" }),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    broadKind: varchar("broad_kind", { length: 40 }).notNull(),
    characterType: varchar("character_type", { length: 40 }).notNull(),
    subtype: varchar("subtype", { length: 80 }).notNull(),
    originMode: varchar("origin_mode", { length: 20 }).$type<OriginMode>().notNull(),
    universeSeed: varchar("universe_seed", { length: 120 }).notNull(),
    createdBy: varchar("created_by", { length: 20 }).notNull().default("system"),
    accepted: boolean("accepted").notNull().default(false),
    handoffId: uuid("handoff_id"),
    payload: jsonb("payload").$type<OriginPackagePayload>().notNull(),
    generationBatchId: uuid("generation_batch_id"),
    generationSource: text("generation_source").notNull().default("legacy_static"),
    modelId: text("model_id"),
    ...timestampColumns,
  },
  (table) => [
    index("character_origin_packages_profile_idx").on(table.childProfileId),
    index("character_origin_packages_household_idx").on(table.householdId),
    index("character_origin_packages_accepted_idx").on(
      table.childProfileId,
      table.accepted,
    ),
    index("character_origin_packages_batch_idx").on(
      table.childProfileId,
      table.generationBatchId,
    ),
  ],
);

export type CharacterOriginPackageRecord =
  typeof characterOriginPackages.$inferSelect;
export type NewCharacterOriginPackageRecord =
  typeof characterOriginPackages.$inferInsert;
