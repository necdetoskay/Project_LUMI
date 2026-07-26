import { check, index, jsonb, primaryKey, timestamp, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { systemSchema } from "../schemas";

export const idempotencyKeys = systemSchema.table(
  "idempotency_keys",
  {
    scope: varchar("scope", { length: 120 }).notNull(),
    key: varchar("key", { length: 240 }).notNull(),
    requestHash: varchar("request_hash", { length: 128 }).notNull(),
    status: varchar("status", { length: 40 }).notNull().default("processing"),
    responseCode: new (require("drizzle-orm/pg-core").integer)("response_code"),
    responseBody: jsonb("response_body").$type<Record<string, unknown>>(),
    lockedUntil: timestamp("locked_until", { withTimezone: true, mode: "date" }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.scope, table.key], name: "idempotency_keys_pk" }),
    index("idempotency_keys_expiry_idx").on(table.expiresAt),
    check("idempotency_keys_status_check", sql`${table.status} IN ('processing','completed','failed')`),
  ],
);
