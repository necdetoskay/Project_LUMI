import { index, numeric, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { primaryId } from "../common";
import { aiSchema } from "../schemas";
import { generationAttempts } from "./generation-attempts";

export const costRecords = aiSchema.table(
  "cost_records",
  {
    id: primaryId(),
    generationAttemptId: uuid("generation_attempt_id").notNull().references(() => generationAttempts.id, { onDelete: "cascade" }),
    costType: varchar("cost_type", { length: 60 }).notNull(),
    amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("cost_records_attempt_idx").on(table.generationAttemptId),
    index("cost_records_currency_time_idx").on(table.currency, table.recordedAt),
  ],
);
