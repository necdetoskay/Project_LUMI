# Character Visual Canon Contract

Status: CANONICAL FOR S42

A character's appearance is domain identity, not a transient UI picture.

## Required canonical state

A future persisted visual canon must bind `characterId`, `householdId`, `childProfileId`, `canonVersion`, selected candidate/reference asset, appearance descriptor, generation batch/provider/model provenance, timestamps and future regeneration/conditioning linkage.

## Candidate semantics

The intended production UX is one generation batch containing four distinct candidates for the same semantic character specification. Candidates remain proposals until explicit selection. Selection must be idempotent, tenant-scoped and versioned; later story illustrations must use the selected reference/descriptor rather than silently changing identity.

## Truthfulness boundary

The current character-bootstrap flow has no verified production image-generation plus durable/referenceable asset persistence path. S42 therefore must not render decorative placeholders as generated candidates and must not claim visual selection is complete. The UI may show a clearly labelled readiness state only.

## Required future invariants

- `CHARACTER-VISUAL-CANON-001`: exactly one selected visual canon per active character canon version.
- `CHARACTER-VISUAL-TRUTHFULNESS-001`: placeholders are never represented as generated output.
- `CHARACTER-VISUAL-TENANT-001`: candidates/assets cannot cross household or child-profile boundaries.
- `CHARACTER-VISUAL-IDEMPOTENCY-001`: selection retry cannot create duplicate active canons.
- `CHARACTER-VISUAL-CONTINUITY-001`: subsequent image generation uses the selected canonical identity reference.
- provenance for a committed canon version is immutable/auditable.
