import { jsonb, uuid, varchar } from "drizzle-orm/pg-core";

import { primaryId, softDeleteColumn, timestampColumns } from "../common";
import { profileSchema } from "../schemas";
import { childProfiles } from "./child-profiles";

export interface SelectedArchetype {
  id: string;
  canonicalType: string;
  title: string;
  description: string;
  personalityHook: string;
  storyPromise: string;
  themeTags: string[];
}

export type FirstRunHandoffPayload = {
  childProfileId: string;
  characterType: "explorer" | "inventor" | "storyteller" | "helper" | "dreamer";
  originMode: "manual" | "auto";
  preferenceHints?: {
    preferredThemes?: string[];
    avoidedThemes?: string[];
  };
  selectedArchetype?: SelectedArchetype;
};

export const firstRunHandoffs = profileSchema.table("first_run_handoffs", {
  id: primaryId(),
  childProfileId: uuid("child_profile_id")
    .notNull()
    .references(() => childProfiles.id, { onDelete: "cascade" }),
  characterType: varchar("character_type", { length: 40 }).notNull(),
  originMode: varchar("origin_mode", { length: 20 }).notNull(),
  payload: jsonb("payload").$type<FirstRunHandoffPayload>().notNull(),
  ...timestampColumns,
  ...softDeleteColumn,
});

export type FirstRunHandoffRecord = typeof firstRunHandoffs.$inferSelect;
export type NewFirstRunHandoffRecord = typeof firstRunHandoffs.$inferInsert;
