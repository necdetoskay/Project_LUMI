-- S29-T02: Quest template persistence schema.
-- Additive, forward-only (no rollback). Templates are authored, design-time
-- quest *definitions*. They are not household/world-scoped; a concrete Quest
-- instance (S28) binds them at instantiation time. Additive-only: created +
-- read, no in-place update/delete in this sprint.

BEGIN;

CREATE TABLE IF NOT EXISTS profile.quest_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key VARCHAR(120) NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_quest_template_key UNIQUE (template_key)
);

CREATE TABLE IF NOT EXISTS profile.quest_template_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL,
  objective_index INTEGER NOT NULL,
  objective_key VARCHAR(120) NOT NULL,
  title TEXT NOT NULL,
  CONSTRAINT uq_quest_template_objective UNIQUE (template_id, objective_index),
  CONSTRAINT fk_quest_template_objective_template
    FOREIGN KEY (template_id) REFERENCES profile.quest_templates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS quest_template_objective_template_idx
  ON profile.quest_template_objectives (template_id);

COMMIT;