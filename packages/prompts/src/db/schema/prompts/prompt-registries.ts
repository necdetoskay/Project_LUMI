import { index, uuid, varchar } from "drizzle-orm/pg-core";

import { primaryId, timestampColumns } from "./common";
import { promptsSchema } from "./schemas";

export const promptRegistries = promptsSchema.table(
  "prompt_registries",
  {
    id: primaryId(),
    householdId: uuid("household_id").notNull(),
    promptKey: varchar("prompt_key", { length: 160 }).notNull(),
    purpose: varchar("purpose", { length: 500 }).notNull(),
    ...timestampColumns,
  },
  (table) => [
    index("prompt_reg_household_idx").on(table.householdId),
    index("prompt_reg_key_idx").on(table.promptKey),
  ],
);

export type PromptRegistryRecord = typeof promptRegistries.$inferSelect;
export type NewPromptRegistryRecord = typeof promptRegistries.$inferInsert;
