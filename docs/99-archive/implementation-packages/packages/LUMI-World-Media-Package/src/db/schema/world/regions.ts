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
import { worldSchema } from "../schemas";
import { assets } from "../media/assets";
import { biomes } from "./biomes";
import { worlds } from "./worlds";

export type RegionMetadata = {
  summary?: string;
  dangerLevel?: number;
  travelTags?: string[];
};

export const regions = worldSchema.table(
  "regions",
  {
    id: primaryId(),
    worldId: uuid("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    parentRegionId: uuid("parent_region_id"),
    biomeId: uuid("biome_id")
      .references(() => biomes.id, { onDelete: "set null" }),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    mapAssetId: uuid("map_asset_id")
      .references(() => assets.id, { onDelete: "set null" }),
    metadata: jsonb("metadata")
      .$type<RegionMetadata>()
      .notNull()
      .default({}),
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (table) => [
    uniqueIndex("regions_world_slug_unique_active")
      .on(table.worldId, table.slug)
      .where(sql`${table.deletedAt} IS NULL`),
    index("regions_world_idx").on(table.worldId),
    index("regions_parent_idx").on(table.parentRegionId),
    index("regions_biome_idx").on(table.biomeId),
  ],
);

export type RegionRecord = typeof regions.$inferSelect;
export type NewRegionRecord = typeof regions.$inferInsert;
