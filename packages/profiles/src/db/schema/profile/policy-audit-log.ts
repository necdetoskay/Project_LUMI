import { index, jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { profileSchema } from "../schemas";

export const policyAuditLog = profileSchema.table(
  "policy_audit_log",
  {
    id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    householdId: uuid("household_id").notNull(),
    actorId: uuid("actor_id").notNull(),
    action: varchar("action", { length: 80 }).notNull(),
    beforeState: jsonb("before_state").$type<Record<string, unknown>>().notNull(),
    afterState: jsonb("after_state").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull().defaultNow(),
  },
  (table) => [
    index("policy_audit_log_household_idx").on(table.householdId),
    index("policy_audit_log_created_idx").on(table.createdAt),
  ],
);

export type PolicyAuditLogRecord = typeof policyAuditLog.$inferSelect;
export type NewPolicyAuditLogRecord = typeof policyAuditLog.$inferInsert;
