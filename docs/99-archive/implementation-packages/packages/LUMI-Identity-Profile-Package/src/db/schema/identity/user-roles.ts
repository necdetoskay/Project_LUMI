import {
  index,
  primaryKey,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { identitySchema } from "../schemas";
import { roles } from "./roles";
import { users } from "./users";

export const userRoles = identitySchema.table(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    assignedAt: timestamp("assigned_at", {
      withTimezone: true,
      mode: "date",
    }).notNull().defaultNow(),
    assignedBy: uuid("assigned_by")
      .references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.roleId],
      name: "user_roles_pk",
    }),
    index("user_roles_role_idx").on(table.roleId),
  ],
);
