import { index, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { primaryId, softDeleteColumn, timestampColumns } from "../common";
import { profileSchema } from "../schemas";

export const households = profileSchema.table(
  "households",
  {
    id: primaryId(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (table) => [
    uniqueIndex("households_slug_unique_active")
      .on(table.slug)
      .where(sql`${table.deletedAt} IS NULL`),
    index("households_name_idx").on(table.name),
  ],
);

export type HouseholdRecord = typeof households.$inferSelect;
export type NewHouseholdRecord = typeof households.$inferInsert;
