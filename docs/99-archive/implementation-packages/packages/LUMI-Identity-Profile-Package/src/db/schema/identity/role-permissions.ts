import {
  index,
  primaryKey,
  uuid,
} from "drizzle-orm/pg-core";

import { identitySchema } from "../schemas";
import { permissions } from "./permissions";
import { roles } from "./roles";

export const rolePermissions = identitySchema.table(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({
      columns: [table.roleId, table.permissionId],
      name: "role_permissions_pk",
    }),
    index("role_permissions_permission_idx").on(table.permissionId),
  ],
);
