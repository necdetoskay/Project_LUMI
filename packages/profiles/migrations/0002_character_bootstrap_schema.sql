-- Sprint 04: Character Bootstrap and First-Run Handoff Consumption
-- Additive migration only: creates tables under profile schema
-- Does NOT modify existing Sprint 02 auth or Sprint 03 profile tables

BEGIN;

CREATE SCHEMA IF NOT EXISTS profile;

-- LUMI Characters: minimum character domain persistence for first-run bootstrap.
-- Mature character trait/need/vector system stays out of scope (future sprint).
CREATE TABLE IF NOT EXISTS profile.lumi_characters (
  id UUID PRIMARY KEY,
  child_profile_id UUID NOT NULL
    REFERENCES profile.child_profiles(id)
    ON DELETE CASCADE,
  household_id UUID NOT NULL
    REFERENCES profile.households(id)
    ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  broad_kind VARCHAR(40) NOT NULL,
  character_type VARCHAR(40) NOT NULL,
  subtype VARCHAR(80) NOT NULL,
  origin_mode VARCHAR(20) NOT NULL,
  first_origin_package_id UUID NOT NULL,
  origin_concept VARCHAR(500) NOT NULL,
  starting_region_archetype VARCHAR(120) NOT NULL,
  starting_location VARCHAR(200) NOT NULL,
  home_archetype VARCHAR(120) NOT NULL,
  nearby_npc_seed VARCHAR(500) NOT NULL,
  first_mystery_seed VARCHAR(500) NOT NULL,
  universe_seed VARCHAR(120) NOT NULL,
  safety_bounds JSONB NOT NULL DEFAULT '{}'::jsonb,
  preference_hints JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT lumi_characters_origin_mode_check CHECK (
    origin_mode IN ('manual', 'auto')
  ),
  CONSTRAINT lumi_characters_broad_kind_check CHECK (
    broad_kind IN ('human', 'animal', 'fantasy', 'robot', 'sea_creature', 'sky_creature')
  ),
  CONSTRAINT lumi_characters_type_check CHECK (
    character_type IN ('explorer', 'inventor', 'storyteller', 'helper', 'dreamer')
  )
);

CREATE INDEX IF NOT EXISTS lumi_characters_household_idx
  ON profile.lumi_characters (household_id);

CREATE INDEX IF NOT EXISTS lumi_characters_child_profile_idx
  ON profile.lumi_characters (child_profile_id);

CREATE UNIQUE INDEX IF NOT EXISTS lumi_characters_active_per_profile_unique
  ON profile.lumi_characters (child_profile_id)
  WHERE deleted_at IS NULL;

-- Character Origin Packages: candidate packages plus the accepted one.
-- Deterministic, template-based generator fills these; LLM is NOT required.
CREATE TABLE IF NOT EXISTS profile.character_origin_packages (
  id UUID PRIMARY KEY,
  child_profile_id UUID NOT NULL
    REFERENCES profile.child_profiles(id)
    ON DELETE CASCADE,
  household_id UUID NOT NULL
    REFERENCES profile.households(id)
    ON DELETE CASCADE,
  broad_kind VARCHAR(40) NOT NULL,
  character_type VARCHAR(40) NOT NULL,
  subtype VARCHAR(80) NOT NULL,
  origin_mode VARCHAR(20) NOT NULL,
  universe_seed VARCHAR(120) NOT NULL,
  created_by VARCHAR(20) NOT NULL DEFAULT 'system',
  accepted BOOLEAN NOT NULL DEFAULT FALSE,
  handoff_id UUID
    REFERENCES profile.first_run_handoffs(id)
    ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS character_origin_packages_profile_idx
  ON profile.character_origin_packages (child_profile_id);

CREATE INDEX IF NOT EXISTS character_origin_packages_household_idx
  ON profile.character_origin_packages (household_id);

CREATE UNIQUE INDEX IF NOT EXISTS character_origin_packages_accepted_unique
  ON profile.character_origin_packages (child_profile_id, accepted)
  WHERE accepted IS TRUE;

-- First-run handoff consumption ledger: idempotency guard against double consume.
-- One handoff = at most one consumption (DB-level unique guarantee).
CREATE TABLE IF NOT EXISTS profile.first_run_handoff_consumptions (
  id UUID PRIMARY KEY,
  handoff_id UUID NOT NULL
    REFERENCES profile.first_run_handoffs(id)
    ON DELETE CASCADE,
  child_profile_id UUID NOT NULL
    REFERENCES profile.child_profiles(id)
    ON DELETE CASCADE,
  household_id UUID NOT NULL
    REFERENCES profile.households(id)
    ON DELETE CASCADE,
  character_id UUID NOT NULL UNIQUE
    REFERENCES profile.lumi_characters(id)
    ON DELETE CASCADE,
  consumed_by_user_id UUID NOT NULL,
  origin_mode_at_consume VARCHAR(20) NOT NULL,
  note VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS first_run_handoff_consumptions_handoff_unique
  ON profile.first_run_handoff_consumptions (handoff_id);

CREATE INDEX IF NOT EXISTS first_run_handoff_consumptions_profile_idx
  ON profile.first_run_handoff_consumptions (child_profile_id);

CREATE INDEX IF NOT EXISTS first_run_handoff_consumptions_household_idx
  ON profile.first_run_handoff_consumptions (household_id);

COMMIT;
