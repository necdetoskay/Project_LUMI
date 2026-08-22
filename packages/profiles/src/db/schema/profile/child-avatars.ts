import { sql } from "drizzle-orm";
import {
  check,
  index,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { profileSchema } from "../schemas";

export const childAvatars = profileSchema.table(
  "child_avatars",
  {
    characterId: uuid("character_id").primaryKey(),
    characterSubtype: varchar("character_subtype", { length: 20 })
      .notNull()
      .default("child_avatar"),
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
    index("child_avatars_household_idx").on(table.householdId),
    uniqueIndex("child_avatars_active_child_unique")
      .on(table.childProfileId)
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      "child_avatars_subtype_check",
      sql`${table.characterSubtype} = 'child_avatar'`,
    ),
  ],
);

export type ChildAvatarRecord = typeof childAvatars.$inferSelect;
export type NewChildAvatarRecord = typeof childAvatars.$inferInsert;
