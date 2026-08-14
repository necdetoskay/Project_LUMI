import { integer, jsonb, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId } from "../common";
import { profileSchema } from "../schemas";

export type AiPromptAuditAction = "draft_created" | "activated" | "rollback";

export const aiPromptAuditLog = profileSchema.table("ai_prompt_audit_log", {
  id: primaryId(),
  promptKey: varchar("prompt_key", { length: 160 }).notNull(),
  promptVersion: integer("prompt_version").notNull(),
  action: varchar("action", { length: 40 }).$type<AiPromptAuditAction>().notNull(),
  actorUserId: uuid("actor_user_id"),
  reason: text("reason"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
