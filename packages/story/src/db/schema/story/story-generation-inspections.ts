import {
  index,
  integer,
  jsonb,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { primaryId } from "./common";
import { storySchema } from "./schemas";

/**
 * Immutable audit evidence for a successfully persisted generated scene.
 *
 * contextManifest is the canonical historical evidence of what the model saw.
 * inspectorProjection is a read-optimised snapshot for admin tooling and may
 * evolve independently through its schemaVersion without changing the manifest.
 */
export const storyGenerationInspections = storySchema.table(
  "story_generation_inspections",
  {
    id: primaryId(),
    householdId: uuid("household_id").notNull(),
    storySessionId: uuid("story_session_id").notNull(),
    generatedSceneId: uuid("generated_scene_id").notNull(),
    sourceHookId: uuid("source_hook_id"),
    modelId: varchar("model_id", { length: 200 }).notNull(),
    attempt: integer("attempt").notNull(),
    contextContentHash: varchar("context_content_hash", {
      length: 128,
    }).notNull(),
    contextManifest: jsonb("context_manifest").notNull(),
    inspectorProjection: jsonb("inspector_projection").notNull(),
    schemaVersion: integer("schema_version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("story_generation_inspection_session_idx").on(
      table.storySessionId,
      table.createdAt,
    ),
    index("story_generation_inspection_scene_idx").on(table.generatedSceneId),
    index("story_generation_inspection_hash_idx").on(table.contextContentHash),
  ],
);

export type StoryGenerationInspectionRecord =
  typeof storyGenerationInspections.$inferSelect;
export type NewStoryGenerationInspectionRecord =
  typeof storyGenerationInspections.$inferInsert;
