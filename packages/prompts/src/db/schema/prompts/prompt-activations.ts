import { index, timestamp, uuid } from "drizzle-orm/pg-core";

import { primaryId } from "./common";
import { promptsSchema } from "./schemas";

export const promptActivations = promptsSchema.table(
  "prompt_activations",
  {
    id: primaryId(),
    registryId: uuid("registry_id").notNull(),
    activeVersionId: uuid("active_version_id").notNull(),
    householdId: uuid("household_id").notNull(),
    activatedAt: timestamp("activated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    deactivatedAt: timestamp("deactivated_at", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (table) => [
    index("prompt_act_registry_idx").on(table.registryId),
    index("prompt_act_version_idx").on(table.activeVersionId),
  ],
);

export type PromptActivationRecord = typeof promptActivations.$inferSelect;
export type NewPromptActivationRecord = typeof promptActivations.$inferInsert;
