-- Sprint 37 follow-up: cascade story_session_characters -> lumi_characters.
-- 0008 converted the story cascade chain but left
-- story.story_session_characters.character_id -> profile.lumi_characters with
-- NO ACTION, which blocks the child-profile permanent-delete cascade depending
-- on row processing order. Converting it to ON DELETE CASCADE makes the
-- permanent delete deterministic regardless of cascade traversal order.
-- Forward-only; no rollback. Session character rows are only removed together
-- with their session (0008 CASCADE) or their character, so cascading here is
-- consistent with the child-profile hard-delete path.

ALTER TABLE story.story_session_characters
  DROP CONSTRAINT IF EXISTS fk_story_session_characters_character,
  ADD CONSTRAINT fk_story_session_characters_character
    FOREIGN KEY (character_id) REFERENCES profile.lumi_characters(id) ON DELETE CASCADE;
