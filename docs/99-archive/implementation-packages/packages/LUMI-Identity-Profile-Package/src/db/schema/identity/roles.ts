import {
  boolean,
  uniqueIndex,
  varchar,
  text,
} from "drizzle-orm/pg-core";

import {
  primaryId,
  timestampColumns,
} from "../common";
import { identitySchema } from "../schemas";

export const roles = identitySchema.table(
  "roles",
  {
    id: primaryId(),
    code: varchar("code", { length: 80 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    isSystem: boolean("is_system").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("roles_code_unique").on(table.code),
  ],
);

export type RoleRecord = typeof roles.$inferSelect;
export type NewRoleRecord = typeof roles.$inferInsert;
