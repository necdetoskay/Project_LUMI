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
import { regions } from "./regions";

export type LocationMetadata = {
  summary?: string;
  coordinates?: {
    x?: number;
    y?: number;
    z?: number;
  };
  discoverable?: boolean;
};

export const locations = worldSchema.table(
  "locations",
  {
    id: primaryId(),
    regionId: uuid("region_id")
      .notNull()
      .references(() => regions.id, { onDelete: "cascade" }),
    parentLocationId: uuid("parent_location_id"),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    locationType: varchar("location_type", { length: 60 })
      .notNull()
      .default("place"),
    imageAssetId: uuid("image_asset_id")
      .references(() => assets.id, { onDelete: "set null" }),
    metadata: jsonb("metadata")
      .$type<LocationMetadata>()
      .notNull()
      .default({}),
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (table) => [
    uniqueIndex("locations_region_slug_unique_active")
      .on(table.regionId, table.slug)
      .where(sql`${table.deletedAt} IS NULL`),
    index("locations_region_idx").on(table.regionId),
    index("locations_parent_idx").on(table.parentLocationId),
    index("locations_type_idx").on(table.locationType),
  ],
);

export type LocationRecord = typeof locations.$inferSelect;
export type NewLocationRecord = typeof locations.$inferInsert;
