import { check, index, integer, jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId, timestampColumns } from "../common";
import { systemSchema } from "../schemas";

export const jobs = systemSchema.table(
  "jobs",
  {
    id: primaryId(),
    jobType: varchar("job_type", { length: 120 }).notNull(),
    status: varchar("status", { length: 40 }).notNull().default("pending"),
    priority: integer("priority").notNull().default(100),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true, mode: "date" }),
    lockedBy: varchar("locked_by", { length: 160 }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    ...timestampColumns,
  },
  (table) => [
    index("jobs_status_schedule_idx").on(table.status, table.scheduledAt, table.priority),
    check("jobs_status_check", sql`${table.status} IN ('pending','running','completed','failed','cancelled','dead_letter')`),
  ],
);
