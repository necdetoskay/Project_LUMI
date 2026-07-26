import { index, integer, jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId } from "../common";
import { systemSchema } from "../schemas";
import { jobs } from "./jobs";

export const jobAttempts = systemSchema.table(
  "job_attempts",
  {
    id: primaryId(),
    jobId: uuid("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull(),
    workerId: varchar("worker_id", { length: 160 }),
    status: varchar("status", { length: 40 }).notNull(),
    errorPayload: jsonb("error_payload").$type<Record<string, unknown>>(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("job_attempts_job_idx").on(table.jobId, table.attemptNumber),
  ],
);
