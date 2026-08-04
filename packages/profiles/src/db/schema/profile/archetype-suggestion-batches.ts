import { sql } from "drizzle-orm";
import { jsonb, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import type { CharacterType } from "../../../domain/types";
import { primaryId, timestampColumns } from "../common";
import { profileSchema } from "../schemas";
import { childProfiles } from "./child-profiles";
import { households } from "./households";

export interface PersistedArchetypeSuggestion {
  id: string;
  canonicalType: CharacterType;
  title: string;
  description: string;
  personalityHook: string;
  storyPromise: string;
  themeTags: string[];
}

export interface PersistedExcludedConcept {
  title: string;
  description: string;
  personalityHook: string;
  storyPromise: string;
}

export const archetypeSuggestionBatches = profileSchema.table(
  "archetype_suggestion_batches",
  {
    id: primaryId(),
    userId: varchar("user_id", { length: 128 }).notNull(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    childProfileId: uuid("child_profile_id")
      .notNull()
      .references(() => childProfiles.id, { onDelete: "cascade" }),
    archetypes: jsonb("archetypes")
      .$type<PersistedArchetypeSuggestion[]>()
      .notNull(),
    modelId: text("model_id").notNull(),
    generationNonce: text("generation_nonce").notNull(),
    excludedConcepts: jsonb("excluded_concepts")
      .$type<PersistedExcludedConcept[]>()
      .notNull()
      .default([]),
    ...timestampColumns,
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`(NOW() + INTERVAL '1 hour')`),
  },
);

export type ArchetypeSuggestionBatchRecord =
  typeof archetypeSuggestionBatches.$inferSelect;
export type NewArchetypeSuggestionBatchRecord =
  typeof archetypeSuggestionBatches.$inferInsert;
