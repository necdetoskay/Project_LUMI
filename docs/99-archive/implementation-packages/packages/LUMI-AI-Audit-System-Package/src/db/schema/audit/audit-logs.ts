import { index, jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId } from "../common";
import { auditSchema } from "../schemas";

export const auditLogs = auditSchema.table(
  "audit_logs",
  {
    id: primaryId(),
    actorType: varchar("actor_type", { length: 60 }).notNull(),
    actorId: uuid("actor_id"),
    action: varchar("action", { length: 120 }).notNull(),
    entityType: varchar("entity_type", { length: 100 }).notNull(),
    entityId: uuid("entity_id"),
    requestId: varchar("request_id", { length: 160 }),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: varchar("user_agent", { length: 500 }),
    beforeState: jsonb("before_state").$type<Record<string, unknown>>(),
    afterState: jsonb("after_state").$type<Record<string, unknown>>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_entity_time_idx").on(table.entityType, table.entityId, table.occurredAt),
    index("audit_logs_actor_time_idx").on(table.actorType, table.actorId, table.occurredAt),
    index("audit_logs_request_idx").on(table.requestId),
  ],
);
