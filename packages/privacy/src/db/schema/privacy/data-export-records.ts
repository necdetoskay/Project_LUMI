import { index, jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { privacySchema } from "../schemas";

export const dataExportRecords = privacySchema.table(
  "data_export_records",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    householdId: uuid("household_id").notNull(),
    childProfileId: uuid("child_profile_id").notNull(),
    requestedBy: uuid("requested_by").notNull(),
    exportFormat: varchar("export_format", { length: 40 })
      .notNull()
      .default("lumi-child-v1"),
    status: varchar("status", { length: 20 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("data_export_records_household_idx").on(table.householdId),
    index("data_export_records_child_idx").on(table.childProfileId),
  ],
);

export type DataExportRecord = typeof dataExportRecords.$inferSelect;
export type NewDataExportRecord = typeof dataExportRecords.$inferInsert;
