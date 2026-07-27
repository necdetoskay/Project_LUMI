-- Sprint 03: Household and Child Profile Foundation
-- Additive migration: creates profile schema tables only
-- Does not modify existing auth tables

BEGIN;

CREATE SCHEMA IF NOT EXISTS profile;

-- Households: authoritative scope root for family space
CREATE TABLE IF NOT EXISTS profile.households (
  id UUID PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS households_slug_unique_active
  ON profile.households (slug)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS households_name_idx
  ON profile.households (name);

-- Household members: ownership and role management.
-- Deliberately no foreign key to auth.parent_accounts yet because the current
-- auth slice lives outside this package boundary. Application services must
-- validate user existence against the auth identity source before writes.
CREATE TABLE IF NOT EXISTS profile.household_members (
  household_id UUID NOT NULL
    REFERENCES profile.households(id)
    ON DELETE CASCADE,
  user_id UUID NOT NULL,
  membership_role VARCHAR(40) NOT NULL DEFAULT 'member',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT household_members_pk PRIMARY KEY (household_id, user_id),
  CONSTRAINT household_members_role_check CHECK (
    membership_role IN ('owner', 'guardian', 'member')
  )
);

CREATE INDEX IF NOT EXISTS household_members_user_idx
  ON profile.household_members (user_id);

-- Child profiles: age-banded profiles with soft archive.
-- Numeric age and birth date are intentionally out of scope for this sprint.
CREATE TABLE IF NOT EXISTS profile.child_profiles (
  id UUID PRIMARY KEY,
  household_id UUID NOT NULL
    REFERENCES profile.households(id)
    ON DELETE CASCADE,
  display_name VARCHAR(120) NOT NULL,
  age_band VARCHAR(40) NOT NULL,
  locale VARCHAR(12) NOT NULL DEFAULT 'tr-TR',
  avatar_asset_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT child_profiles_age_band_check CHECK (
    age_band IN ('3-5', '6-8', '9-12', '13+')
  )
);

CREATE INDEX IF NOT EXISTS child_profiles_household_idx
  ON profile.child_profiles (household_id);

-- Child preferences: validated preference storage
CREATE TABLE IF NOT EXISTS profile.child_preferences (
  child_profile_id UUID PRIMARY KEY
    REFERENCES profile.child_profiles(id)
    ON DELETE CASCADE,
  story_length VARCHAR(20) NOT NULL DEFAULT 'medium',
  interaction_level INTEGER NOT NULL DEFAULT 2,
  image_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  audio_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT child_preferences_story_length_check CHECK (
    story_length IN ('short', 'medium', 'long')
  ),
  CONSTRAINT child_preferences_interaction_level_check CHECK (
    interaction_level BETWEEN 0 AND 5
  )
);

-- Parental settings: parent-controlled safety boundaries
CREATE TABLE IF NOT EXISTS profile.parental_settings (
  household_id UUID PRIMARY KEY
    REFERENCES profile.households(id)
    ON DELETE CASCADE,
  max_daily_stories INTEGER NOT NULL DEFAULT 3,
  content_boundary VARCHAR(20) NOT NULL DEFAULT 'strict',
  time_limit_minutes INTEGER,
  require_parent_approval_for_ai BOOLEAN NOT NULL DEFAULT FALSE,
  allow_image_generation BOOLEAN NOT NULL DEFAULT TRUE,
  allow_tts BOOLEAN NOT NULL DEFAULT TRUE,
  safety_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT parental_settings_daily_limit_check CHECK (
    max_daily_stories BETWEEN 0 AND 50
  ),
  CONSTRAINT parental_settings_content_boundary_check CHECK (
    content_boundary IN ('strict', 'moderate', 'open')
  )
);

-- Policy audit log: append-only trail for parent policy changes
CREATE TABLE IF NOT EXISTS profile.policy_audit_log (
  id UUID PRIMARY KEY,
  household_id UUID NOT NULL,
  actor_id UUID NOT NULL,
  action VARCHAR(80) NOT NULL,
  before_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS policy_audit_log_household_idx
  ON profile.policy_audit_log (household_id);

CREATE INDEX IF NOT EXISTS policy_audit_log_created_idx
  ON profile.policy_audit_log (created_at);

-- First-run handoffs: onboarding character intent payload
-- No foreign key to character/world tables (Sprint 03 boundary)
CREATE TABLE IF NOT EXISTS profile.first_run_handoffs (
  id UUID PRIMARY KEY,
  child_profile_id UUID NOT NULL
    REFERENCES profile.child_profiles(id)
    ON DELETE CASCADE,
  character_type VARCHAR(40) NOT NULL,
  origin_mode VARCHAR(20) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

COMMIT;
