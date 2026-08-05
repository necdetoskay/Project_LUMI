import { index, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { privacySchema } from "../schemas";

export const consentRecords = privacySchema.table(
  "consent_records",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    householdId: uuid("household_id").notNull(),
    childProfileId: uuid("child_profile_id"),
    consentType: varchar("consent_type", { length: 80 }).notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    version: uuid("version")
      .notNull()
      .$defaultFn(() => crypto.randomUUID()),
    grantedAt: timestamp("granted_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    revokedAt: timestamp("revoked_at", {
      withTimezone: true,
      mode: "date",
    }),
    grantedBy: uuid("granted_by").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("consent_records_household_idx").on(table.householdId),
    index("consent_records_child_idx").on(table.childProfileId),
    index("consent_records_type_idx").on(table.consentType),
  ],
);

export type ConsentRecord = typeof consentRecords.$inferSelect;
export type NewConsentRecord = typeof consentRecords.$inferInsert;
