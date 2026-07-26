import {
  boolean,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import {
  primaryId,
  timestampColumns,
} from "../common";
import { identitySchema } from "../schemas";

export const permissions = identitySchema.table(
  "permissions",
  {
    id: primaryId(),
    code: varchar("code", { length: 120 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("permissions_code_unique").on(table.code),
  ],
);

export type PermissionRecord = typeof permissions.$inferSelect;
export type NewPermissionRecord = typeof permissions.$inferInsert;
