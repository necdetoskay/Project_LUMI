import { check, index, jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId, timestampColumns } from "../common";
import { aiSchema } from "../schemas";
import { promptTemplateVersions } from "./prompt-template-versions";
import { aiModels } from "./models";

export const generationRequests = aiSchema.table(
  "generation_requests",
  {
    id: primaryId(),
    requestType: varchar("request_type", { length: 80 }).notNull(),
    subjectType: varchar("subject_type", { length: 80 }),
    subjectId: uuid("subject_id"),
    promptTemplateVersionId: uuid("prompt_template_version_id").references(() => promptTemplateVersions.id, { onDelete: "set null" }),
    requestedModelId: uuid("requested_model_id").references(() => aiModels.id, { onDelete: "set null" }),
    status: varchar("status", { length: 40 }).notNull().default("pending"),
    inputPayload: jsonb("input_payload").$type<Record<string, unknown>>().notNull().default({}),
    outputPayload: jsonb("output_payload").$type<Record<string, unknown>>(),
    requestedAt: timestamp("requested_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    ...timestampColumns,
  },
  (table) => [
    index("generation_requests_subject_idx").on(table.subjectType, table.subjectId),
    index("generation_requests_status_idx").on(table.status),
    check("generation_requests_status_check", sql`${table.status} IN ('pending','running','completed','failed','cancelled')`),
  ],
);
