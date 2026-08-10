CREATE TABLE IF NOT EXISTS profile.managed_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES profile.households(id) ON DELETE CASCADE,
  subject_type varchar(32) NOT NULL CHECK (subject_type IN ('character','npc','location','item','story_scene')),
  subject_id uuid NOT NULL,
  asset_kind varchar(64) NOT NULL,
  storage_ref text NOT NULL,
  mime_type varchar(120),
  width integer,
  height integer,
  provider varchar(80),
  model varchar(160),
  origin_type varchar(24) NOT NULL DEFAULT 'generated' CHECK (origin_type IN ('generated','uploaded','imported','derived')),
  lifecycle_state varchar(24) NOT NULL DEFAULT 'candidate' CHECK (lifecycle_state IN ('candidate','canonical','rejected','archived')),
  source_system varchar(80),
  source_record_id uuid,
  source_asset_id uuid,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  rejected_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_managed_assets_source_record UNIQUE (source_system, source_record_id)
);

CREATE INDEX IF NOT EXISTS managed_assets_subject_idx
  ON profile.managed_assets(household_id, subject_type, subject_id);
CREATE INDEX IF NOT EXISTS managed_assets_storage_ref_idx
  ON profile.managed_assets(storage_ref);

CREATE TABLE IF NOT EXISTS profile.managed_asset_canons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES profile.households(id) ON DELETE CASCADE,
  subject_type varchar(32) NOT NULL CHECK (subject_type IN ('character','npc','location','item','story_scene')),
  subject_id uuid NOT NULL,
  asset_kind varchar(64) NOT NULL,
  selected_asset_id uuid REFERENCES profile.managed_assets(id) ON DELETE SET NULL,
  status varchar(24) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','selected','archived')),
  version integer NOT NULL DEFAULT 1,
  selected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_managed_asset_canons_subject_kind UNIQUE (household_id, subject_type, subject_id, asset_kind)
);

CREATE INDEX IF NOT EXISTS managed_asset_canons_household_idx
  ON profile.managed_asset_canons(household_id);

CREATE TABLE IF NOT EXISTS profile.managed_asset_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES profile.households(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES profile.managed_assets(id) ON DELETE CASCADE,
  from_state varchar(24),
  to_state varchar(24) NOT NULL CHECK (to_state IN ('candidate','canonical','rejected','archived')),
  reason varchar(120),
  actor_type varchar(24) NOT NULL DEFAULT 'system' CHECK (actor_type IN ('parent','admin','system','import')),
  actor_user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS managed_asset_lifecycle_events_asset_idx
  ON profile.managed_asset_lifecycle_events(asset_id, created_at);

-- Backfill the Sprint 53 character visual library into the generic Sprint 55 model.
-- Reusing the legacy asset UUID keeps canon pointers stable while source_system/source_record_id
-- make the import replay-safe on every migration rehearsal.
INSERT INTO profile.managed_assets (
  id,
  household_id,
  subject_type,
  subject_id,
  asset_kind,
  storage_ref,
  mime_type,
  width,
  height,
  provider,
  model,
  origin_type,
  lifecycle_state,
  source_system,
  source_record_id,
  source_asset_id,
  provenance,
  metadata,
  rejected_at,
  archived_at,
  created_at,
  updated_at
)
SELECT
  asset.id,
  asset.household_id,
  'character',
  asset.character_id,
  asset.asset_kind,
  asset.storage_ref,
  asset.mime_type,
  asset.width,
  asset.height,
  asset.provider,
  asset.model,
  'generated',
  asset.lifecycle_state,
  'character_visual_assets',
  asset.id,
  asset.source_composite_asset_id,
  asset.provenance,
  jsonb_strip_nulls(
    jsonb_build_object(
      'generationJobId', asset.generation_job_id,
      'candidateIndex', asset.candidate_index,
      'cropMetadata', asset.crop_metadata
    )
  ),
  asset.rejected_at,
  asset.archived_at,
  asset.created_at,
  asset.updated_at
FROM profile.character_visual_assets asset
ON CONFLICT (source_system, source_record_id) DO NOTHING;

INSERT INTO profile.managed_asset_canons (
  id,
  household_id,
  subject_type,
  subject_id,
  asset_kind,
  selected_asset_id,
  status,
  version,
  selected_at,
  created_at,
  updated_at
)
SELECT
  canon.id,
  canon.household_id,
  'character',
  canon.character_id,
  'character_portrait',
  canon.selected_asset_id,
  canon.status,
  canon.version,
  canon.selected_at,
  canon.created_at,
  canon.updated_at
FROM profile.character_visual_canons canon
ON CONFLICT (household_id, subject_type, subject_id, asset_kind) DO NOTHING;

INSERT INTO profile.managed_asset_lifecycle_events (
  household_id,
  asset_id,
  from_state,
  to_state,
  reason,
  actor_type,
  metadata,
  created_at
)
SELECT
  asset.household_id,
  asset.id,
  NULL,
  asset.lifecycle_state,
  's53_backfill',
  'import',
  jsonb_build_object('sourceSystem', 'character_visual_assets'),
  asset.created_at
FROM profile.character_visual_assets asset
WHERE NOT EXISTS (
  SELECT 1
  FROM profile.managed_asset_lifecycle_events event
  WHERE event.asset_id = asset.id
    AND event.reason = 's53_backfill'
);

-- Transitional compatibility bridge: Sprint 53 remains a supported producer during Sprint 55.
-- New or changed character visual records are mirrored into the generic model until Sprint 56
-- moves generation to the generic asset boundary directly.
CREATE OR REPLACE FUNCTION profile.sync_character_visual_asset_to_managed_asset()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO profile.managed_assets (
    id,
    household_id,
    subject_type,
    subject_id,
    asset_kind,
    storage_ref,
    mime_type,
    width,
    height,
    provider,
    model,
    origin_type,
    lifecycle_state,
    source_system,
    source_record_id,
    source_asset_id,
    provenance,
    metadata,
    rejected_at,
    archived_at,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.household_id,
    'character',
    NEW.character_id,
    NEW.asset_kind,
    NEW.storage_ref,
    NEW.mime_type,
    NEW.width,
    NEW.height,
    NEW.provider,
    NEW.model,
    'generated',
    NEW.lifecycle_state,
    'character_visual_assets',
    NEW.id,
    NEW.source_composite_asset_id,
    NEW.provenance,
    jsonb_strip_nulls(
      jsonb_build_object(
        'generationJobId', NEW.generation_job_id,
        'candidateIndex', NEW.candidate_index,
        'cropMetadata', NEW.crop_metadata
      )
    ),
    NEW.rejected_at,
    NEW.archived_at,
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (id) DO UPDATE SET
    storage_ref = EXCLUDED.storage_ref,
    mime_type = EXCLUDED.mime_type,
    width = EXCLUDED.width,
    height = EXCLUDED.height,
    provider = EXCLUDED.provider,
    model = EXCLUDED.model,
    lifecycle_state = EXCLUDED.lifecycle_state,
    source_asset_id = EXCLUDED.source_asset_id,
    provenance = EXCLUDED.provenance,
    metadata = EXCLUDED.metadata,
    rejected_at = EXCLUDED.rejected_at,
    archived_at = EXCLUDED.archived_at,
    updated_at = EXCLUDED.updated_at;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO profile.managed_asset_lifecycle_events (
      household_id,
      asset_id,
      from_state,
      to_state,
      reason,
      actor_type,
      metadata,
      created_at
    ) VALUES (
      NEW.household_id,
      NEW.id,
      NULL,
      NEW.lifecycle_state,
      's53_sync_insert',
      'system',
      jsonb_build_object('sourceSystem', 'character_visual_assets'),
      NEW.created_at
    );
  ELSIF OLD.lifecycle_state IS DISTINCT FROM NEW.lifecycle_state THEN
    INSERT INTO profile.managed_asset_lifecycle_events (
      household_id,
      asset_id,
      from_state,
      to_state,
      reason,
      actor_type,
      metadata,
      created_at
    ) VALUES (
      NEW.household_id,
      NEW.id,
      OLD.lifecycle_state,
      NEW.lifecycle_state,
      's53_sync_lifecycle',
      'system',
      jsonb_build_object('sourceSystem', 'character_visual_assets'),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_character_visual_asset_to_managed_asset
  ON profile.character_visual_assets;
CREATE TRIGGER trg_sync_character_visual_asset_to_managed_asset
AFTER INSERT OR UPDATE ON profile.character_visual_assets
FOR EACH ROW
EXECUTE FUNCTION profile.sync_character_visual_asset_to_managed_asset();

CREATE OR REPLACE FUNCTION profile.sync_character_visual_canon_to_managed_asset_canon()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO profile.managed_asset_canons (
    id,
    household_id,
    subject_type,
    subject_id,
    asset_kind,
    selected_asset_id,
    status,
    version,
    selected_at,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.household_id,
    'character',
    NEW.character_id,
    'character_portrait',
    NEW.selected_asset_id,
    NEW.status,
    NEW.version,
    NEW.selected_at,
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (household_id, subject_type, subject_id, asset_kind) DO UPDATE SET
    selected_asset_id = EXCLUDED.selected_asset_id,
    status = EXCLUDED.status,
    version = EXCLUDED.version,
    selected_at = EXCLUDED.selected_at,
    updated_at = EXCLUDED.updated_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_character_visual_canon_to_managed_asset_canon
  ON profile.character_visual_canons;
CREATE TRIGGER trg_sync_character_visual_canon_to_managed_asset_canon
AFTER INSERT OR UPDATE ON profile.character_visual_canons
FOR EACH ROW
EXECUTE FUNCTION profile.sync_character_visual_canon_to_managed_asset_canon();
