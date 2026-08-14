ALTER TABLE profile.character_visual_canons
  ADD COLUMN IF NOT EXISTS selected_header_asset_id uuid
    REFERENCES profile.character_visual_assets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS character_visual_canons_header_asset_idx
  ON profile.character_visual_canons(selected_header_asset_id);
