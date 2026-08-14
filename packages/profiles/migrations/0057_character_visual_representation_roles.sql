ALTER TABLE profile.character_visual_canons
  ADD COLUMN IF NOT EXISTS selected_full_body_asset_id uuid
    REFERENCES profile.character_visual_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS selected_half_body_asset_id uuid
    REFERENCES profile.character_visual_assets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS character_visual_canons_full_body_idx
  ON profile.character_visual_canons(selected_full_body_asset_id);

CREATE INDEX IF NOT EXISTS character_visual_canons_half_body_idx
  ON profile.character_visual_canons(selected_half_body_asset_id);
