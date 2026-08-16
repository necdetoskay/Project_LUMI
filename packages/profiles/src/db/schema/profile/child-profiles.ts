import {
  check,
  index,
  integer,
  jsonb,
  varchar,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import type { ChildProfileMetadata } from "../../../domain/types";
import { primaryId, softDeleteColumn, timestampColumns } from "../common";
import { profileSchema } from "../schemas";
import { households } from "./households";

export const childProfiles = profileSchema.table(
  "child_profiles",
  {
    id: primaryId(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    ageBand: varchar("age_band", { length: 40 }).notNull(),
    ageYears: integer("age_years"),
    locale: varchar("locale", { length: 12 }).notNull().default("tr-TR"),
    avatarAssetId: uuid("avatar_asset_id"),
    metadata: jsonb("metadata")
      .$type<ChildProfileMetadata>()
      .notNull()
      .default({}),
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (table) => [
    index("child_profiles_household_idx").on(table.householdId),
    check(
      "child_profiles_age_band_check",
      sql`${table.ageBand} IN ('3-5', '6-8', '9-12', '13+')`,
    ),
    check(
      "child_profiles_age_years_check",
      sql`${table.ageYears} IS NULL OR (${table.ageYears} >= 3 AND ${table.ageYears} <= 17)`,
    ),
  ],
);

export type ChildProfileRecord = typeof childProfiles.$inferSelect;
export type NewChildProfileRecord = typeof childProfiles.$inferInsert;
