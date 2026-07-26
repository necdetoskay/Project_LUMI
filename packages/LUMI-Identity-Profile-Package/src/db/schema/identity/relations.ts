import { relations } from "drizzle-orm";

import { accounts } from "./accounts";
import { permissions } from "./permissions";
import { rolePermissions } from "./role-permissions";
import { roles } from "./roles";
import { sessions } from "./sessions";
import { userRoles } from "./user-roles";
import { users } from "./users";

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  userRoles: many(userRoles),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions),
}));

export const permissionsRelations = relations(
  permissions,
  ({ many }) => ({
    rolePermissions: many(rolePermissions),
  }),
);
