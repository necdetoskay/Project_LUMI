-- Phase 6: the active-per-profile uniqueness rule belongs to the child avatar,
-- not to canonical NPC identities that share the same child/world scope.

BEGIN;

DROP INDEX IF EXISTS profile.lumi_characters_active_per_profile_unique;

CREATE UNIQUE INDEX lumi_characters_active_per_profile_unique
  ON profile.lumi_characters (child_profile_id)
  WHERE deleted_at IS NULL
    AND character_subtype = 'child_avatar';

COMMIT;
