import { check, index, jsonb, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId, softDeleteColumn, timestampColumns } from "../common";
import { characterSchema } from "../schemas";
import { childProfiles } from "../profile/child-profiles";
import { locations } from "../world/locations";
import { worlds } from "../world/worlds";
import { assets } from "../media/assets";

export type CharacterMetadata = {
  species?: string;
  occupation?: string;
  familyRole?: string;
  narrativeTags?: string[];
};

export const characters = characterSchema.table(
  "characters",
  {
    id: primaryId(),
    worldId: uuid("world_id").notNull().references(() => worlds.id, { onDelete: "cascade" }),
    childProfileId: uuid("child_profile_id").references(() => childProfiles.id, { onDelete: "set null" }),
    currentLocationId: uuid("current_location_id").references(() => locations.id, { onDelete: "set null" }),
    portraitAssetId: uuid("portrait_asset_id").references(() => assets.id, { onDelete: "set null" }),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    characterType: varchar("character_type", { length: 40 }).notNull(),
    status: varchar("status", { length: 40 }).notNull().default("active"),
    metadata: jsonb("metadata").$type<CharacterMetadata>().notNull().default({}),
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (table) => [
    uniqueIndex("characters_world_slug_unique_active")
      .on(table.worldId, table.slug)
      .where(sql`${table.deletedAt} IS NULL`),
    index("characters_world_idx").on(table.worldId),
    index("characters_child_profile_idx").on(table.childProfileId),
    index("characters_location_idx").on(table.currentLocationId),
    check("characters_type_check", sql`${table.characterType} IN ('child_avatar','npc','companion','guest')`),
    check("characters_status_check", sql`${table.status} IN ('active','inactive','missing','retired')`),
  ],
);

export type CharacterRecord = typeof characters.$inferSelect;
export type NewCharacterRecord = typeof characters.$inferInsert;
