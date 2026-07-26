BEGIN;

CREATE TABLE identity.users (
  id UUID PRIMARY KEY,
  email CITEXT NOT NULL,
  display_name VARCHAR(160) NOT NULL,
  password_hash VARCHAR(255),
  email_verified_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX users_email_unique_active
  ON identity.users (email)
  WHERE deleted_at IS NULL;

CREATE INDEX users_active_idx
  ON identity.users (is_active);

CREATE TABLE identity.accounts (
  user_id UUID NOT NULL
    REFERENCES identity.users(id)
    ON DELETE CASCADE,
  provider VARCHAR(80) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT accounts_pk PRIMARY KEY (
    provider,
    provider_account_id
  ),
  CONSTRAINT accounts_user_provider_unique
    UNIQUE (user_id, provider)
);

CREATE INDEX accounts_user_idx
  ON identity.accounts (user_id);

CREATE TABLE identity.sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL
    REFERENCES identity.users(id)
    ON DELETE CASCADE,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX sessions_user_idx
  ON identity.sessions (user_id);

CREATE INDEX sessions_expiry_idx
  ON identity.sessions (expires_at);

CREATE TABLE identity.roles (
  id UUID PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE identity.permissions (
  id UUID PRIMARY KEY,
  code VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE identity.user_roles (
  user_id UUID NOT NULL
    REFERENCES identity.users(id)
    ON DELETE CASCADE,
  role_id UUID NOT NULL
    REFERENCES identity.roles(id)
    ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID
    REFERENCES identity.users(id)
    ON DELETE SET NULL,
  CONSTRAINT user_roles_pk PRIMARY KEY (
    user_id,
    role_id
  )
);

CREATE INDEX user_roles_role_idx
  ON identity.user_roles (role_id);

CREATE TABLE identity.role_permissions (
  role_id UUID NOT NULL
    REFERENCES identity.roles(id)
    ON DELETE CASCADE,
  permission_id UUID NOT NULL
    REFERENCES identity.permissions(id)
    ON DELETE CASCADE,
  CONSTRAINT role_permissions_pk PRIMARY KEY (
    role_id,
    permission_id
  )
);

CREATE INDEX role_permissions_permission_idx
  ON identity.role_permissions (permission_id);

CREATE TABLE profile.households (
  id UUID PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX households_slug_unique_active
  ON profile.households (slug)
  WHERE deleted_at IS NULL;

CREATE INDEX households_name_idx
  ON profile.households (name);

CREATE TABLE profile.household_members (
  household_id UUID NOT NULL
    REFERENCES profile.households(id)
    ON DELETE CASCADE,
  user_id UUID NOT NULL
    REFERENCES identity.users(id)
    ON DELETE CASCADE,
  membership_role VARCHAR(40) NOT NULL DEFAULT 'member',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT household_members_pk PRIMARY KEY (
    household_id,
    user_id
  ),
  CONSTRAINT household_members_role_check CHECK (
    membership_role IN ('owner', 'guardian', 'member')
  )
);

CREATE INDEX household_members_user_idx
  ON profile.household_members (user_id);

CREATE TABLE profile.child_profiles (
  id UUID PRIMARY KEY,
  household_id UUID NOT NULL
    REFERENCES profile.households(id)
    ON DELETE CASCADE,
  display_name VARCHAR(120) NOT NULL,
  birth_date DATE,
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

CREATE INDEX child_profiles_household_idx
  ON profile.child_profiles (household_id);

CREATE TABLE profile.child_preferences (
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

CREATE TABLE profile.child_interests (
  child_profile_id UUID NOT NULL
    REFERENCES profile.child_profiles(id)
    ON DELETE CASCADE,
  interest_code VARCHAR(80) NOT NULL,
  weight REAL NOT NULL DEFAULT 0.5,
  CONSTRAINT child_interests_pk PRIMARY KEY (
    child_profile_id,
    interest_code
  ),
  CONSTRAINT child_interests_weight_check CHECK (
    weight BETWEEN 0 AND 1
  )
);

CREATE INDEX child_interests_code_idx
  ON profile.child_interests (interest_code);

CREATE TABLE profile.parental_settings (
  household_id UUID PRIMARY KEY
    REFERENCES profile.households(id)
    ON DELETE CASCADE,
  max_daily_stories INTEGER NOT NULL DEFAULT 3,
  require_parent_approval_for_ai BOOLEAN NOT NULL DEFAULT FALSE,
  allow_image_generation BOOLEAN NOT NULL DEFAULT TRUE,
  allow_tts BOOLEAN NOT NULL DEFAULT TRUE,
  safety_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT parental_settings_daily_limit_check CHECK (
    max_daily_stories BETWEEN 0 AND 50
  )
);

COMMIT;
