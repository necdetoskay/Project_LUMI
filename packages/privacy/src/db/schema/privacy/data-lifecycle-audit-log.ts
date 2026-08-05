import { index, jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { privacySchema } from "../schemas";

export const dataLifecycleAuditLog = privacySchema.table(
  "data_lifecycle_audit_log",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    householdId: uuid("household_id").notNull(),
    actorId: uuid("actor_id").notNull(),
    action: varchar("action", { length: 80 }).notNull(),
    subjectType: varchar("subject_type", { length: 40 }).notNull(),
    subjectId: uuid("subject_id").notNull(),
    beforeState: jsonb("before_state")
      .$type<Record<string, unknown>>()
      .notNull(),
    afterState: jsonb("after_state").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("data_lifecycle_audit_log_household_idx").on(table.householdId),
    index("data_lifecycle_audit_log_created_idx").on(table.createdAt),
    index("data_lifecycle_audit_log_subject_idx").on(table.subjectId),
  ],
);

export type DataLifecycleAuditLogRecord =
  typeof dataLifecycleAuditLog.$inferSelect;
export type NewDataLifecycleAuditLogRecord =
  typeof dataLifecycleAuditLog.$inferInsert;
