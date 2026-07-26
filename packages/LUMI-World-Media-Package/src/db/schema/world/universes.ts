import {
  index,
  jsonb,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import {
  primaryId,
  softDeleteColumn,
  timestampColumns,
} from "../common";
import { profileSchema, worldSchema } from "../schemas";
import { households } from "../profile/households";

export type UniverseMetadata = {
  theme?: string;
  description?: string;
  defaultLocale?: string;
};

export const universes = worldSchema.table(
  "universes",
  {
    id: primaryId(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    metadata: jsonb("metadata")
      .$type<UniverseMetadata>()
      .notNull()
      .default({}),
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (table) => [
    uniqueIndex("universes_household_slug_unique_active")
      .on(table.householdId, table.slug)
      .where(sql`${table.deletedAt} IS NULL`),
    index("universes_household_idx").on(table.householdId),
  ],
);

export type UniverseRecord = typeof universes.$inferSelect;
export type NewUniverseRecord = typeof universes.$inferInsert;
