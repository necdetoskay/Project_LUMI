CREATE TABLE IF NOT EXISTS profile.character_visual_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES profile.households(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES profile.lumi_characters(id) ON DELETE CASCADE,
  idempotency_key varchar(160) NOT NULL,
  visual_brief_version varchar(40) NOT NULL,
  visual_brief_fingerprint varchar(128) NOT NULL,
  visual_brief jsonb NOT NULL,
  provider varchar(80),
  model varchar(160),
  requested_candidate_count integer NOT NULL DEFAULT 1 CHECK (requested_candidate_count > 0),
  status varchar(24) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','succeeded','failed','cancelled')),
  provider_request_id varchar(200),
  usage_metadata jsonb,
  cost_metadata jsonb,
  error_code varchar(120),
  error_message text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_character_visual_generation_job_idempotency UNIQUE (household_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS character_visual_generation_jobs_character_idx
  ON profile.character_visual_generation_jobs(character_id);

CREATE TABLE IF NOT EXISTS profile.character_visual_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES profile.households(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES profile.lumi_characters(id) ON DELETE CASCADE,
  generation_job_id uuid REFERENCES profile.character_visual_generation_jobs(id) ON DELETE SET NULL,
  asset_kind varchar(40) NOT NULL DEFAULT 'character_portrait',
  storage_ref text NOT NULL,
  mime_type varchar(120),
  width integer,
  height integer,
  provider varchar(80),
  model varchar(160),
  candidate_index integer NOT NULL DEFAULT 0 CHECK (candidate_index >= 0),
  lifecycle_state varchar(24) NOT NULL DEFAULT 'candidate' CHECK (lifecycle_state IN ('candidate','canonical','rejected','archived')),
  source_composite_asset_id uuid,
  crop_metadata jsonb,
  provenance jsonb NOT NULL,
  rejected_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS character_visual_assets_character_idx
  ON profile.character_visual_assets(character_id);
CREATE INDEX IF NOT EXISTS character_visual_assets_generation_job_idx
  ON profile.character_visual_assets(generation_job_id);

CREATE TABLE IF NOT EXISTS profile.character_visual_canons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES profile.households(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES profile.lumi_characters(id) ON DELETE CASCADE,
  selected_asset_id uuid REFERENCES profile.character_visual_assets(id) ON DELETE SET NULL,
  visual_brief_version varchar(40) NOT NULL,
  visual_brief_fingerprint varchar(128) NOT NULL,
  appearance_traits jsonb NOT NULL,
  style_profile jsonb NOT NULL,
  safety_constraints jsonb NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','selected','archived')),
  selected_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_character_visual_canons_character UNIQUE (character_id)
);

CREATE INDEX IF NOT EXISTS character_visual_canons_household_idx
  ON profile.character_visual_canons(household_id);
