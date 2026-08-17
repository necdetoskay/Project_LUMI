import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import type {
  CharacterGenesis,
  CoreTension,
  FoundationGenerationProvenance,
  LivingWorldBootstrapManifest,
  SagaCanon,
  SagaProgression,
  SocialEcologyPlan,
} from "../../../domain/character-genesis";
import { primaryId, timestampColumns } from "../common";
import { profileSchema } from "../schemas";
import { characterCreationCycles } from "./character-creation-cycles";
import { characterOriginPackages } from "./character-origin-packages";
import { childProfiles } from "./child-profiles";
import { households } from "./households";
import { lumiCharacters } from "./lumi-characters";

export const characterFoundations = profileSchema.table(
  "character_foundations",
  {
    id: primaryId(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    childProfileId: uuid("child_profile_id")
      .notNull()
      .references(() => childProfiles.id, { onDelete: "cascade" }),
    characterId: uuid("character_id")
      .notNull()
      .references(() => lumiCharacters.id, { onDelete: "cascade" }),
    // World belongs to the world package authority. Keep the identifier here for
    // scoping/provenance but validate existence through the application service.
    worldId: uuid("world_id").notNull(),
    originPackageId: uuid("origin_package_id").references(
      () => characterOriginPackages.id,
      { onDelete: "set null" },
    ),
    creationCycleId: uuid("creation_cycle_id").references(
      () => characterCreationCycles.id,
      { onDelete: "set null" },
    ),
    schemaVersion: integer("schema_version").notNull().default(1),
    foundationStatus: varchar("foundation_status", { length: 32 })
      .notNull()
      .default("draft"),
    genesis: jsonb("genesis").$type<CharacterGenesis>().notNull(),
    socialEcology: jsonb("social_ecology").$type<SocialEcologyPlan>().notNull(),
    coreTension: jsonb("core_tension").$type<CoreTension>().notNull(),
    sagaCanon: jsonb("saga_canon").$type<SagaCanon>().notNull(),
    sagaProgression: jsonb("saga_progression")
      .$type<SagaProgression>()
      .notNull(),
    provenance: jsonb("provenance")
      .$type<FoundationGenerationProvenance>()
      .notNull(),
    bootstrapStatus: varchar("bootstrap_status", { length: 24 })
      .notNull()
      .default("pending"),
    bootstrapAttemptCount: integer("bootstrap_attempt_count").notNull().default(0),
    bootstrapManifest: jsonb("bootstrap_manifest")
      .$type<LivingWorldBootstrapManifest>()
      .notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 160 }).notNull(),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("uq_character_foundations_character").on(table.characterId),
    uniqueIndex("uq_character_foundations_household_idempotency").on(
      table.householdId,
      table.idempotencyKey,
    ),
    index("character_foundations_child_idx").on(table.childProfileId),
    index("character_foundations_world_idx").on(table.worldId),
    index("character_foundations_bootstrap_status_idx").on(
      table.bootstrapStatus,
    ),
    check(
      "character_foundations_schema_version_check",
      sql`${table.schemaVersion} >= 1`,
    ),
    check(
      "character_foundations_status_check",
      sql`${table.foundationStatus} IN ('draft', 'committed', 'bootstrap_pending', 'bootstrap_running', 'bootstrap_complete', 'bootstrap_failed')`,
    ),
    check(
      "character_foundations_bootstrap_status_check",
      sql`${table.bootstrapStatus} IN ('pending', 'running', 'complete', 'failed')`,
    ),
    check(
      "character_foundations_bootstrap_attempt_check",
      sql`${table.bootstrapAttemptCount} >= 0`,
    ),
  ],
);

export type CharacterFoundationRecord = typeof characterFoundations.$inferSelect;
export type NewCharacterFoundationRecord =
  typeof characterFoundations.$inferInsert;
