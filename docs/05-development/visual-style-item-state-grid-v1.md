# Item State Grid Pipeline v1

Flow: semantic item states -> deterministic grid prompt -> one image generation -> raster split -> center-square crop -> max 300px PNG -> per-state managed assets.

Canonical compatibility: the first semantic state remains the canonical `item-icon`; all state assets share the same item subject and carry `stateId`, style version, grid coordinates, and generation batch provenance.

Supported raster inputs in v1 are PNG and JPEG. Unsupported formats fail closed so an unsplit grid can never be published as an item icon.
