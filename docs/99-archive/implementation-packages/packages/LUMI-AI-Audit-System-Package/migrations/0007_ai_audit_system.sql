BEGIN;

CREATE TABLE ai.providers (
  id UUID PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ai.models (
  id UUID PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES ai.providers(id) ON DELETE RESTRICT,
  code VARCHAR(180) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  capability_type VARCHAR(60) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  pricing_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider_id, code)
);

CREATE TABLE ai.prompt_templates (
  id UUID PRIMARY KEY,
  code VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  domain VARCHAR(80) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ai.prompt_template_versions (
  id UUID PRIMARY KEY,
  prompt_template_id UUID NOT NULL REFERENCES ai.prompt_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  template_text TEXT NOT NULL,
  schema_version VARCHAR(40) NOT NULL DEFAULT '1.0',
  variables_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (prompt_template_id, version_number)
);

CREATE TABLE ai.generation_requests (
  id UUID PRIMARY KEY,
  request_type VARCHAR(80) NOT NULL,
  subject_type VARCHAR(80),
  subject_id UUID,
  prompt_template_version_id UUID REFERENCES ai.prompt_template_versions(id) ON DELETE SET NULL,
  requested_model_id UUID REFERENCES ai.models(id) ON DELETE SET NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_payload JSONB,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('pending','running','completed','failed','cancelled'))
);

CREATE TABLE ai.generation_attempts (
  id UUID PRIMARY KEY,
  generation_request_id UUID NOT NULL REFERENCES ai.generation_requests(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES ai.models(id) ON DELETE RESTRICT,
  attempt_number INTEGER NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'running',
  provider_request_id VARCHAR(240),
  latency_ms INTEGER,
  error_code VARCHAR(120),
  error_payload JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CHECK (status IN ('running','completed','failed','cancelled'))
);

CREATE TABLE ai.token_usage (
  generation_attempt_id UUID PRIMARY KEY REFERENCES ai.generation_attempts(id) ON DELETE CASCADE,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cached_input_tokens INTEGER NOT NULL DEFAULT 0,
  reasoning_tokens INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE ai.cost_records (
  id UUID PRIMARY KEY,
  generation_attempt_id UUID NOT NULL REFERENCES ai.generation_attempts(id) ON DELETE CASCADE,
  cost_type VARCHAR(60) NOT NULL,
  amount NUMERIC(18,8) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ai.safety_reviews (
  id UUID PRIMARY KEY,
  generation_request_id UUID NOT NULL REFERENCES ai.generation_requests(id) ON DELETE CASCADE,
  review_type VARCHAR(60) NOT NULL,
  decision VARCHAR(40) NOT NULL,
  reasons JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (decision IN ('allow','allow_with_changes','block','manual_review'))
);

CREATE TABLE audit.audit_logs (
  id UUID PRIMARY KEY,
  actor_type VARCHAR(60) NOT NULL,
  actor_id UUID,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  request_id VARCHAR(160),
  ip_address VARCHAR(64),
  user_agent VARCHAR(500),
  before_state JSONB,
  after_state JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE system.outbox_events (
  id UUID PRIMARY KEY,
  aggregate_type VARCHAR(100) NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type VARCHAR(160) NOT NULL,
  event_version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('pending','publishing','published','failed','dead_letter'))
);

CREATE TABLE system.idempotency_keys (
  scope VARCHAR(120) NOT NULL,
  key VARCHAR(240) NOT NULL,
  request_hash VARCHAR(128) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'processing',
  response_code INTEGER,
  response_body JSONB,
  locked_until TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (scope, key),
  CHECK (status IN ('processing','completed','failed'))
);

CREATE TABLE system.feature_flags (
  id UUID PRIMARY KEY,
  code VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE system.feature_flag_overrides (
  feature_flag_id UUID NOT NULL REFERENCES system.feature_flags(id) ON DELETE CASCADE,
  subject_type VARCHAR(80) NOT NULL,
  subject_id UUID NOT NULL,
  is_enabled BOOLEAN NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (feature_flag_id, subject_type, subject_id)
);

CREATE TABLE system.jobs (
  id UUID PRIMARY KEY,
  job_type VARCHAR(120) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 100,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  locked_by VARCHAR(160),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('pending','running','completed','failed','cancelled','dead_letter'))
);

CREATE TABLE system.job_attempts (
  id UUID PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES system.jobs(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  worker_id VARCHAR(160),
  status VARCHAR(40) NOT NULL,
  error_payload JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE system.system_settings (
  key VARCHAR(160) PRIMARY KEY,
  value JSONB NOT NULL,
  description VARCHAR(500),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
