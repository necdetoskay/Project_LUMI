CREATE TABLE IF NOT EXISTS profile.image_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES profile.households(id) ON DELETE CASCADE,
  subject_type varchar(32) NOT NULL CHECK (subject_type IN ('character','npc','location','item','story_scene')),
  subject_id uuid NOT NULL,
  asset_kind varchar(64) NOT NULL,
  idempotency_key varchar(160) NOT NULL,
  prompt_fingerprint varchar(128) NOT NULL,
  requested_candidate_count integer NOT NULL CHECK (requested_candidate_count BETWEEN 1 AND 4),
  strategy varchar(24) NOT NULL CHECK (strategy IN ('direct','native_batch','grid')),
  provider varchar(80) NOT NULL,
  model varchar(160) NOT NULL,
  aspect_ratio varchar(16) NOT NULL,
  resolution varchar(16) NOT NULL,
  provider_request_count integer NOT NULL CHECK (provider_request_count >= 1),
  estimated_cost_usd numeric(12,6) NOT NULL CHECK (estimated_cost_usd >= 0),
  actual_cost_usd numeric(12,6) CHECK (actual_cost_usd >= 0),
  budget_cap_usd numeric(12,6) NOT NULL CHECK (budget_cap_usd >= 0),
  pricing_basis varchar(200) NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','running','succeeded','failed')),
  provider_request_id varchar(200),
  usage_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  cost_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  plan_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_code varchar(120),
  error_message text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_image_generation_jobs_idempotency UNIQUE (
    household_id,
    subject_type,
    subject_id,
    asset_kind,
    idempotency_key
  )
);

CREATE INDEX IF NOT EXISTS image_generation_jobs_subject_idx
  ON profile.image_generation_jobs(household_id, subject_type, subject_id, created_at);
CREATE INDEX IF NOT EXISTS image_generation_jobs_status_idx
  ON profile.image_generation_jobs(status, created_at);

CREATE TABLE IF NOT EXISTS profile.image_generation_cost_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES profile.households(id) ON DELETE CASCADE,
  generation_job_id uuid NOT NULL REFERENCES profile.image_generation_jobs(id) ON DELETE CASCADE,
  event_type varchar(24) NOT NULL CHECK (event_type IN ('estimated','actual','adjustment')),
  amount_usd numeric(12,6) NOT NULL CHECK (amount_usd >= 0),
  provider varchar(80) NOT NULL,
  model varchar(160) NOT NULL,
  pricing_basis varchar(200) NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS image_generation_cost_events_job_idx
  ON profile.image_generation_cost_events(generation_job_id, created_at);
CREATE INDEX IF NOT EXISTS image_generation_cost_events_household_idx
  ON profile.image_generation_cost_events(household_id, created_at);
