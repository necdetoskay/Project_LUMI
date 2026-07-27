import {
  boolean,
  check,
  index,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { profileSchema } from "../schemas";
import { households } from "./households";

export const householdMembers = profileSchema.table(
  "household_members",
  {
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull(),
    membershipRole: varchar("membership_role", {
      length: 40,
    }).notNull().default("member"),
    isActive: boolean("is_active").notNull().default(true),
    joinedAt: timestamp("joined_at", {
      withTimezone: true,
      mode: "date",
    }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.householdId, table.userId],
      name: "household_members_pk",
    }),
    index("household_members_user_idx").on(table.userId),
    check(
      "household_members_role_check",
      sql`${table.membershipRole} IN ('owner', 'guardian', 'member')`,
    ),
  ],
);

export type HouseholdMemberRecord = typeof householdMembers.$inferSelect;
export type NewHouseholdMemberRecord = typeof householdMembers.$inferInsert;
