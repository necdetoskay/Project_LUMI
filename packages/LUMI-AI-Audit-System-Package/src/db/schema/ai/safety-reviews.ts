import { check, index, jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { primaryId } from "../common";
import { aiSchema } from "../schemas";
import { generationRequests } from "./generation-requests";

export const safetyReviews = aiSchema.table(
  "safety_reviews",
  {
    id: primaryId(),
    generationRequestId: uuid("generation_request_id").notNull().references(() => generationRequests.id, { onDelete: "cascade" }),
    reviewType: varchar("review_type", { length: 60 }).notNull(),
    decision: varchar("decision", { length: 40 }).notNull(),
    reasons: jsonb("reasons").$type<Record<string, unknown>>().notNull().default({}),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("safety_reviews_request_idx").on(table.generationRequestId),
    check("safety_reviews_decision_check", sql`${table.decision} IN ('allow','allow_with_changes','block','manual_review')`),
  ],
);
