import {
  check,
  index,
  integer,
  jsonb,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import type { CharacterFoundationRecord } from "../../../domain/character-genesis";
import { timestampColumns } from "../common";
import { profileSchema } from "../schemas";
import { childProfiles } from "./child-profiles";
import { households } from "./households";
import { lumiCharacters } from "./lumi-characters";

export const characterFoundations = profileSchema.table(
  "character_foundations",
  {
    characterId: uuid("character_id")
      .primaryKey()
      .references(() => lumiCharacters.id, { onDelete: "cascade" }),
    childProfileId: uuid("child_profile_id")
      .notNull()
      .references(() => childProfiles.id, { onDelete: "cascade" }),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    foundation: jsonb("foundation")
      .$type<CharacterFoundationRecord>()
      .notNull(),
    bootstrapStatus: varchar("bootstrap_status", { length: 20 })
      .notNull()
      .default("pending"),
    bootstrapRunId: varchar("bootstrap_run_id", { length: 180 }),
    ...timestampColumns,
  },
  (table) => [
    index("character_foundations_household_idx").on(table.householdId),
    index("character_foundations_child_profile_idx").on(table.childProfileId),
    check("character_foundations_version_check", sql`${table.version} > 0`),
    check(
      "character_foundations_bootstrap_status_check",
      sql`${table.bootstrapStatus} IN ('pending', 'running', 'completed', 'failed')`,
    ),
  ],
);

export type CharacterFoundationRow = typeof characterFoundations.$inferSelect;
export type NewCharacterFoundationRow =
  typeof characterFoundations.$inferInsert;
