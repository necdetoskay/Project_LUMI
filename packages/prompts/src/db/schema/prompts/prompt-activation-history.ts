import { index, timestamp, uuid } from "drizzle-orm/pg-core";

import { primaryId } from "./common";
import { promptsSchema } from "./schemas";

export const promptActivationHistory = promptsSchema.table(
  "prompt_activation_history",
  {
    id: primaryId(),
    registryId: uuid("registry_id").notNull(),
    fromVersionId: uuid("from_version_id"),
    toVersionId: uuid("to_version_id").notNull(),
    householdId: uuid("household_id").notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("prompt_hist_registry_idx").on(table.registryId)],
);

export type PromptActivationHistoryRecord = typeof promptActivationHistory.$inferSelect;
export type NewPromptActivationHistoryRecord = typeof promptActivationHistory.$inferInsert;
