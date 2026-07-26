import {
  boolean,
  citext,
  index,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import {
  primaryId,
  softDeleteColumn,
  timestampColumns,
} from "../common";
import { identitySchema } from "../schemas";

export const users = identitySchema.table(
  "users",
  {
    id: primaryId(),
    email: citext("email").notNull(),
    displayName: varchar("display_name", { length: 160 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }),
    emailVerifiedAt: timestamp("email_verified_at", {
      withTimezone: true,
      mode: "date",
    }),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumn,
  },
  (table) => [
    uniqueIndex("users_email_unique_active")
      .on(table.email)
      .where(sql`${table.deletedAt} IS NULL`),
    index("users_active_idx").on(table.isActive),
  ],
);

export type UserRecord = typeof users.$inferSelect;
export type NewUserRecord = typeof users.$inferInsert;
