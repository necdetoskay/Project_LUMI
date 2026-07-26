import { check, index, integer, jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId } from "../common";
import { aiSchema } from "../schemas";
import { generationRequests } from "./generation-requests";
import { aiModels } from "./models";

export const generationAttempts = aiSchema.table(
  "generation_attempts",
  {
    id: primaryId(),
    generationRequestId: uuid("generation_request_id").notNull().references(() => generationRequests.id, { onDelete: "cascade" }),
    modelId: uuid("model_id").notNull().references(() => aiModels.id, { onDelete: "restrict" }),
    attemptNumber: integer("attempt_number").notNull(),
    status: varchar("status", { length: 40 }).notNull().default("running"),
    providerRequestId: varchar("provider_request_id", { length: 240 }),
    latencyMs: integer("latency_ms"),
    errorCode: varchar("error_code", { length: 120 }),
    errorPayload: jsonb("error_payload").$type<Record<string, unknown>>(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("generation_attempts_request_idx").on(table.generationRequestId),
    check("generation_attempts_status_check", sql`${table.status} IN ('running','completed','failed','cancelled')`),
  ],
);
