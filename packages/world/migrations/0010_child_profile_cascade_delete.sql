-- Sprint 37: Child profile permanent delete cascades into world data.
-- Converts profile.worlds.child_profile_id FK to ON DELETE CASCADE so that a
-- hard delete of profile.child_profiles removes the child's worlds (and, via
-- the existing ON DELETE CASCADE world FKs, regions, locations, homes,
-- inventory, quests and movement events).
-- Forward-only; no rollback. The remaining world FKs that reference
-- profile.lumi_characters are covered because those rows are also removed by
-- the same cascade (world rows are deleted via this FK).

ALTER TABLE profile.worlds
  DROP CONSTRAINT IF EXISTS fk_worlds_child_profile,
  ADD CONSTRAINT fk_worlds_child_profile
    FOREIGN KEY (child_profile_id) REFERENCES profile.child_profiles(id) ON DELETE CASCADE;
