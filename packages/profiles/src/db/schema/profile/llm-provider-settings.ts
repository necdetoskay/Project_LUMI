import { boolean, check, index, text, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { primaryId, timestampColumns } from "../common";
import { profileSchema } from "../schemas";
import { households } from "./households";

export const LLM_PROVIDERS = ["openrouter"] as const;
export type LlmProvider = (typeof LLM_PROVIDERS)[number];

export const llmProviderSettings = profileSchema.table(
  "llm_provider_settings",
  {
    id: primaryId(),
    userId: varchar("user_id", { length: 128 }).notNull(),
    householdId: varchar("household_id", { length: 128 })
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 40 }).notNull().default("openrouter"),
    encryptedApiKey: text("encrypted_api_key"),
    enabled: boolean("enabled").notNull().default(false),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("uq_llm_provider_settings_user_household_provider").on(
      table.userId,
      table.householdId,
      table.provider,
    ),
    index("llm_provider_settings_household_idx").on(table.householdId),
    check(
      "llm_provider_settings_provider_check",
      sql`${table.provider} IN ('openrouter')`,
    ),
  ],
);

export type LlmProviderSettingsRecord = typeof llmProviderSettings.$inferSelect;
export type NewLlmProviderSettingsRecord = typeof llmProviderSettings.$inferInsert;
