import { jsonb, primaryKey, timestamp, varchar } from "drizzle-orm/pg-core";
import { systemSchema } from "../schemas";

export const systemSettings = systemSchema.table(
  "system_settings",
  {
    key: varchar("key", { length: 160 }).notNull(),
    value: jsonb("value").$type<unknown>().notNull(),
    description: varchar("description", { length: 500 }),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.key], name: "system_settings_pk" }),
  ],
);
