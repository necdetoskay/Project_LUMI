# Visual Style Item State Grid v1

This slice turns semantic item states into deployable per-state image assets.

Acceptance contract:

- one provider generation may contain at most four semantic item states;
- 2-state generations use a deterministic left/right layout;
- 3- and 4-state generations use deterministic 2x2 placement;
- generated grids are split before publication;
- each published state asset is square and no larger than 300x300;
- state identity, style ID/version, grid position and max output size are persisted in provenance;
- the first semantic state remains the item canonical image for backwards-compatible consumers;
- text/logo/watermark and character substitution guardrails continue to be compiled into provider prompts;
- unsupported provider raster formats fail closed instead of publishing an unsplit grid.
