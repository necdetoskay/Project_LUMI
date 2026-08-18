-- Sprint 37 follow-up: make world -> character FKs cascade.
-- profile.worlds.character_id, profile.world_character_locations.character_id
-- and profile.world_residences.character_id reference profile.lumi_characters
-- with NO ACTION, which blocks the child-profile permanent-delete cascade
-- depending on row processing order. Converting them to ON DELETE CASCADE makes
-- the permanent delete deterministic regardless of cascade traversal order.
-- Forward-only; no rollback. No flow deletes a lumi_character independently of
-- its child profile today, so the behaviour change is limited to the
-- child-profile hard-delete path.

ALTER TABLE profile.worlds
  DROP CONSTRAINT IF EXISTS fk_worlds_character,
  ADD CONSTRAINT fk_worlds_character
    FOREIGN KEY (character_id) REFERENCES profile.lumi_characters(id) ON DELETE CASCADE;

ALTER TABLE profile.world_character_locations
  DROP CONSTRAINT IF EXISTS fk_character_locations_character,
  ADD CONSTRAINT fk_character_locations_character
    FOREIGN KEY (character_id) REFERENCES profile.lumi_characters(id) ON DELETE CASCADE;

ALTER TABLE profile.world_residences
  DROP CONSTRAINT IF EXISTS fk_world_residences_character,
  ADD CONSTRAINT fk_world_residences_character
    FOREIGN KEY (character_id) REFERENCES profile.lumi_characters(id) ON DELETE CASCADE;
