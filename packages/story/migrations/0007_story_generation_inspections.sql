CREATE TABLE IF NOT EXISTS "story"."story_generation_inspections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "household_id" uuid NOT NULL,
  "story_session_id" uuid NOT NULL,
  "generated_scene_id" uuid NOT NULL,
  "source_hook_id" uuid,
  "model_id" varchar(200) NOT NULL,
  "attempt" integer NOT NULL,
  "context_content_hash" varchar(128) NOT NULL,
  "context_manifest" jsonb NOT NULL,
  "inspector_projection" jsonb NOT NULL,
  "schema_version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "story_generation_inspection_session_idx"
  ON "story"."story_generation_inspections" ("story_session_id", "created_at");

CREATE INDEX IF NOT EXISTS "story_generation_inspection_scene_idx"
  ON "story"."story_generation_inspections" ("generated_scene_id");

CREATE INDEX IF NOT EXISTS "story_generation_inspection_hash_idx"
  ON "story"."story_generation_inspections" ("context_content_hash");
