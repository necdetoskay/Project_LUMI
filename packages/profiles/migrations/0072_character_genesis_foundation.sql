CREATE TABLE IF NOT EXISTS "profile"."character_foundations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "household_id" uuid NOT NULL REFERENCES "profile"."households"("id") ON DELETE CASCADE,
  "child_profile_id" uuid NOT NULL REFERENCES "profile"."child_profiles"("id") ON DELETE CASCADE,
  "character_id" uuid NOT NULL REFERENCES "profile"."lumi_characters"("id") ON DELETE CASCADE,
  "world_id" uuid NOT NULL,
  "origin_package_id" uuid REFERENCES "profile"."character_origin_packages"("id") ON DELETE SET NULL,
  "creation_cycle_id" uuid REFERENCES "profile"."character_creation_cycles"("id") ON DELETE SET NULL,
  "schema_version" integer DEFAULT 1 NOT NULL,
  "foundation_status" varchar(32) DEFAULT 'draft' NOT NULL,
  "genesis" jsonb NOT NULL,
  "social_ecology" jsonb NOT NULL,
  "core_tension" jsonb NOT NULL,
  "saga_canon" jsonb NOT NULL,
  "saga_progression" jsonb NOT NULL,
  "provenance" jsonb NOT NULL,
  "bootstrap_status" varchar(24) DEFAULT 'pending' NOT NULL,
  "bootstrap_attempt_count" integer DEFAULT 0 NOT NULL,
  "bootstrap_manifest" jsonb NOT NULL,
  "idempotency_key" varchar(160) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "character_foundations_schema_version_check" CHECK ("schema_version" >= 1),
  CONSTRAINT "character_foundations_status_check" CHECK ("foundation_status" IN ('draft', 'committed', 'bootstrap_pending', 'bootstrap_running', 'bootstrap_complete', 'bootstrap_failed')),
  CONSTRAINT "character_foundations_bootstrap_status_check" CHECK ("bootstrap_status" IN ('pending', 'running', 'complete', 'failed')),
  CONSTRAINT "character_foundations_bootstrap_attempt_check" CHECK ("bootstrap_attempt_count" >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_character_foundations_character"
  ON "profile"."character_foundations" ("character_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_character_foundations_household_idempotency"
  ON "profile"."character_foundations" ("household_id", "idempotency_key");
CREATE INDEX IF NOT EXISTS "character_foundations_child_idx"
  ON "profile"."character_foundations" ("child_profile_id");
CREATE INDEX IF NOT EXISTS "character_foundations_world_idx"
  ON "profile"."character_foundations" ("world_id");
CREATE INDEX IF NOT EXISTS "character_foundations_bootstrap_status_idx"
  ON "profile"."character_foundations" ("bootstrap_status");
