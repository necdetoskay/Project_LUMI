-- Sprint 18 T05: Consent, export and archive data lifecycle
-- Additive migration: creates privacy schema tables only

BEGIN;

CREATE SCHEMA IF NOT EXISTS privacy;

-- Consent records: household (or child-scoped) consent grants/revocations.
-- Status transitions are versioned via append-only records; a revoke does not
-- delete history (erase-history illusion is explicitly avoided).
CREATE TABLE IF NOT EXISTS privacy.consent_records (
  id UUID PRIMARY KEY,
  household_id UUID NOT NULL,
  child_profile_id UUID,
  consent_type VARCHAR(80) NOT NULL,
  status VARCHAR(20) NOT NULL,
  version UUID NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  granted_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT consent_records_status_check CHECK (
    status IN ('granted', 'revoked')
  ),
  CONSTRAINT consent_records_consent_type_check CHECK (
    consent_type IN (
      'content_generation',
      'media_generation',
      'voice_recording',
      'data_processing'
    )
  )
);

CREATE INDEX IF NOT EXISTS consent_records_household_idx
  ON privacy.consent_records (household_id);

CREATE INDEX IF NOT EXISTS consent_records_child_idx
  ON privacy.consent_records (child_profile_id);

CREATE INDEX IF NOT EXISTS consent_records_type_idx
  ON privacy.consent_records (consent_type);

-- Data lifecycle audit log: append-only trail for consent/export/archive
-- actions. Mirrors the policy_audit_log shape from the profiles package.
CREATE TABLE IF NOT EXISTS privacy.data_lifecycle_audit_log (
  id UUID PRIMARY KEY,
  household_id UUID NOT NULL,
  actor_id UUID NOT NULL,
  action VARCHAR(80) NOT NULL,
  subject_type VARCHAR(40) NOT NULL,
  subject_id UUID NOT NULL,
  before_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS data_lifecycle_audit_log_household_idx
  ON privacy.data_lifecycle_audit_log (household_id);

CREATE INDEX IF NOT EXISTS data_lifecycle_audit_log_created_idx
  ON privacy.data_lifecycle_audit_log (created_at);

CREATE INDEX IF NOT EXISTS data_lifecycle_audit_log_subject_idx
  ON privacy.data_lifecycle_audit_log (subject_id);

-- Data export records: metadata-only export package history.
-- Payload never contains raw story/prompt/memory content.
CREATE TABLE IF NOT EXISTS privacy.data_export_records (
  id UUID PRIMARY KEY,
  household_id UUID NOT NULL,
  child_profile_id UUID NOT NULL,
  requested_by UUID NOT NULL,
  export_format VARCHAR(40) NOT NULL DEFAULT 'lumi-child-v1',
  status VARCHAR(20) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT data_export_records_status_check CHECK (
    status IN ('generated', 'failed', 'purged')
  )
);

CREATE INDEX IF NOT EXISTS data_export_records_household_idx
  ON privacy.data_export_records (household_id);

CREATE INDEX IF NOT EXISTS data_export_records_child_idx
  ON privacy.data_export_records (child_profile_id);

COMMIT;
