-- Sprint 11: Prompt Registry and Versioning schema
-- Forward-only migration with idempotent guards

BEGIN;

-- ============================================================
-- 1. Schema and migration ledger
-- ============================================================

CREATE SCHEMA IF NOT EXISTS prompts;

CREATE TABLE IF NOT EXISTS prompts._prompt_migration_ledger (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. Helper function for idempotent constraint creation
-- ============================================================

CREATE OR REPLACE FUNCTION prompts.__prompt_constraint_exists(p_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = p_name
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. Core tables
-- ============================================================

CREATE TABLE IF NOT EXISTS prompts.prompt_registries (
  id UUID PRIMARY KEY,
  household_id UUID NOT NULL,
  prompt_key VARCHAR(160) NOT NULL,
  purpose VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prompts.prompt_versions (
  id UUID PRIMARY KEY,
  registry_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  template_body TEXT NOT NULL,
  variable_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS prompts.prompt_activations (
  id UUID PRIMARY KEY,
  registry_id UUID NOT NULL,
  active_version_id UUID NOT NULL,
  household_id UUID NOT NULL,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS prompts.prompt_activation_history (
  id UUID PRIMARY KEY,
  registry_id UUID NOT NULL,
  from_version_id UUID,
  to_version_id UUID NOT NULL,
  household_id UUID NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. Constraints
-- ============================================================

DO $$
BEGIN
  IF NOT prompts.__prompt_constraint_exists('fk_prompt_registries_household') THEN
    ALTER TABLE prompts.prompt_registries
      ADD CONSTRAINT fk_prompt_registries_household
      FOREIGN KEY (household_id) REFERENCES profile.households(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT prompts.__prompt_constraint_exists('fk_prompt_versions_registry') THEN
    ALTER TABLE prompts.prompt_versions
      ADD CONSTRAINT fk_prompt_versions_registry
      FOREIGN KEY (registry_id) REFERENCES prompts.prompt_registries(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT prompts.__prompt_constraint_exists('fk_prompt_activations_registry') THEN
    ALTER TABLE prompts.prompt_activations
      ADD CONSTRAINT fk_prompt_activations_registry
      FOREIGN KEY (registry_id) REFERENCES prompts.prompt_registries(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT prompts.__prompt_constraint_exists('fk_prompt_activations_version') THEN
    ALTER TABLE prompts.prompt_activations
      ADD CONSTRAINT fk_prompt_activations_version
      FOREIGN KEY (active_version_id) REFERENCES prompts.prompt_versions(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT prompts.__prompt_constraint_exists('fk_prompt_activations_household') THEN
    ALTER TABLE prompts.prompt_activations
      ADD CONSTRAINT fk_prompt_activations_household
      FOREIGN KEY (household_id) REFERENCES profile.households(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT prompts.__prompt_constraint_exists('fk_prompt_history_registry') THEN
    ALTER TABLE prompts.prompt_activation_history
      ADD CONSTRAINT fk_prompt_history_registry
      FOREIGN KEY (registry_id) REFERENCES prompts.prompt_registries(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT prompts.__prompt_constraint_exists('fk_prompt_history_from_version') THEN
    ALTER TABLE prompts.prompt_activation_history
      ADD CONSTRAINT fk_prompt_history_from_version
      FOREIGN KEY (from_version_id) REFERENCES prompts.prompt_versions(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT prompts.__prompt_constraint_exists('fk_prompt_history_to_version') THEN
    ALTER TABLE prompts.prompt_activation_history
      ADD CONSTRAINT fk_prompt_history_to_version
      FOREIGN KEY (to_version_id) REFERENCES prompts.prompt_versions(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT prompts.__prompt_constraint_exists('fk_prompt_history_household') THEN
    ALTER TABLE prompts.prompt_activation_history
      ADD CONSTRAINT fk_prompt_history_household
      FOREIGN KEY (household_id) REFERENCES profile.households(id);
  END IF;
END $$;

-- ============================================================
-- 5. Indexes and unique constraints
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'prompt_reg_household_idx'
  ) THEN
    CREATE INDEX prompt_reg_household_idx ON prompts.prompt_registries (household_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'prompt_reg_key_idx'
  ) THEN
    CREATE INDEX prompt_reg_key_idx ON prompts.prompt_registries (prompt_key);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_prompt_registry_key'
  ) THEN
    CREATE UNIQUE INDEX uq_prompt_registry_key
      ON prompts.prompt_registries (household_id, prompt_key);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'prompt_ver_registry_idx'
  ) THEN
    CREATE INDEX prompt_ver_registry_idx ON prompts.prompt_versions (registry_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_prompt_version_number'
  ) THEN
    CREATE UNIQUE INDEX uq_prompt_version_number
      ON prompts.prompt_versions (registry_id, version_number);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'prompt_act_registry_idx'
  ) THEN
    CREATE INDEX prompt_act_registry_idx ON prompts.prompt_activations (registry_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'prompt_act_version_idx'
  ) THEN
    CREATE INDEX prompt_act_version_idx ON prompts.prompt_activations (active_version_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_prompt_active_activation'
  ) THEN
    CREATE UNIQUE INDEX uq_prompt_active_activation
      ON prompts.prompt_activations (registry_id)
      WHERE deactivated_at IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'prompt_hist_registry_idx'
  ) THEN
    CREATE INDEX prompt_hist_registry_idx ON prompts.prompt_activation_history (registry_id);
  END IF;
END $$;

-- ============================================================
-- 6. Check constraints
-- ============================================================

DO $$
BEGIN
  IF NOT prompts.__prompt_constraint_exists('chk_prompt_version_status') THEN
    ALTER TABLE prompts.prompt_versions
      ADD CONSTRAINT chk_prompt_version_status
      CHECK (status IN ('draft', 'published', 'archived'));
  END IF;
END $$;

COMMIT;
