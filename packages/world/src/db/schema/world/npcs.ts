import { sql } from "drizzle-orm";
import { check, index, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { profileSchema } from "./schemas";

export const worldNpcs = profileSchema.table(
  "world_npcs",
  {
    characterId: uuid("character_id").primaryKey(),
    characterSubtype: varchar("character_subtype", { length: 20 })
      .notNull()
      .default("npc"),
    worldId: uuid("world_id").notNull(),
    childProfileId: uuid("child_profile_id").notNull(),
    householdId: uuid("household_id").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("world_npcs_world_idx").on(table.worldId),
    index("world_npcs_household_idx").on(table.householdId),
    index("world_npcs_child_profile_idx").on(table.childProfileId),
    check(
      "world_npcs_subtype_check",
      sql`${table.characterSubtype} = 'npc'`,
    ),
  ],
);

export type WorldNpcRecord = typeof worldNpcs.$inferSelect;
export type NewWorldNpcRecord = typeof worldNpcs.$inferInsert;
