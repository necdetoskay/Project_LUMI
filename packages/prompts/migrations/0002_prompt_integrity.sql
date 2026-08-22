-- PR-8 / Data Integrity Hardening

CREATE UNIQUE INDEX IF NOT EXISTS prompt_registry_id_household_unique
  ON prompts.prompt_registries (id, household_id);
CREATE UNIQUE INDEX IF NOT EXISTS prompt_version_id_registry_unique
  ON prompts.prompt_versions (id, registry_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prompt_version_state_check') THEN
    ALTER TABLE prompts.prompt_versions
      ADD CONSTRAINT prompt_version_state_check CHECK (
        version_number >= 1
        AND status IN ('draft', 'published', 'archived')
        AND (
          (status = 'draft' AND published_at IS NULL AND archived_at IS NULL)
          OR (status = 'published' AND published_at IS NOT NULL AND archived_at IS NULL)
          OR (status = 'archived' AND archived_at IS NOT NULL)
        )
      ) NOT VALID;
    ALTER TABLE prompts.prompt_versions VALIDATE CONSTRAINT prompt_version_state_check;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prompt_activation_registry_household_fk') THEN
    ALTER TABLE prompts.prompt_activations
      ADD CONSTRAINT prompt_activation_registry_household_fk
      FOREIGN KEY (registry_id, household_id)
      REFERENCES prompts.prompt_registries (id, household_id) NOT VALID;
    ALTER TABLE prompts.prompt_activations VALIDATE CONSTRAINT prompt_activation_registry_household_fk;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prompt_activation_version_registry_fk') THEN
    ALTER TABLE prompts.prompt_activations
      ADD CONSTRAINT prompt_activation_version_registry_fk
      FOREIGN KEY (active_version_id, registry_id)
      REFERENCES prompts.prompt_versions (id, registry_id) NOT VALID;
    ALTER TABLE prompts.prompt_activations VALIDATE CONSTRAINT prompt_activation_version_registry_fk;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION prompts.protect_published_prompt_version()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'published' AND (
    NEW.registry_id IS DISTINCT FROM OLD.registry_id
    OR NEW.version_number IS DISTINCT FROM OLD.version_number
    OR NEW.template_body IS DISTINCT FROM OLD.template_body
    OR NEW.variable_schema IS DISTINCT FROM OLD.variable_schema
    OR NEW.model_preferences IS DISTINCT FROM OLD.model_preferences
    OR NEW.output_schema IS DISTINCT FROM OLD.output_schema
  ) THEN
    RAISE EXCEPTION 'Published prompt versions are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_published_prompt_version ON prompts.prompt_versions;
CREATE TRIGGER trg_protect_published_prompt_version
BEFORE UPDATE ON prompts.prompt_versions
FOR EACH ROW
EXECUTE FUNCTION prompts.protect_published_prompt_version();
