import {
  check,
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
import { mediaSchema, worldSchema } from "../schemas";
import { assets } from "../media/assets";
import { universes } from "./universes";

export type WorldMetadata = {
  summary?: string;
  primaryTheme?: string;
  contentRating?: string;
  tags?: string[];
};

export const worlds = worldSchema.table(
  "worlds",
  {
    id: primaryId(),
    universeId: uuid("universe_id")
      .notNull()
      .references(() => universes.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    status: varchar("status", { length: 40 })
      .notNull()
      .default("active"),
    coverAssetId: uuid("cover_asset_id")
      .references(() => assets.id, { onDelete: "set null" }),
    metadata: jsonb("metadata")
      .$type<WorldMetadata>()
      .notNull()
      .default({}),
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (table) => [
    uniqueIndex("worlds_universe_slug_unique_active")
      .on(table.universeId, table.slug)
      .where(sql`${table.deletedAt} IS NULL`),
    index("worlds_universe_idx").on(table.universeId),
    index("worlds_cover_asset_idx").on(table.coverAssetId),
    check(
      "worlds_status_check",
      sql`${table.status} IN ('draft', 'active', 'paused', 'archived')`,
    ),
  ],
);

export type WorldRecord = typeof worlds.$inferSelect;
export type NewWorldRecord = typeof worlds.$inferInsert;
