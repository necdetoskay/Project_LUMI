# Character Visual Canon Contract

Status: CANONICAL FOR S42

## Purpose

A character's generated appearance must remain stable across later story illustrations. Visual identity is therefore domain state, not a transient UI image.

## Canon state

A visual canon record is scoped to exactly one canonical character and its household/child-profile boundary. It records:

- `characterId`
- `householdId`
- `childProfileId`
- `canonVersion`
- `selectedCandidateId`
- `referenceAssetUri`
- `appearanceDescriptor`
- `generationProvider`
- `generationModel`
- `generationBatchId`
- `createdAt`
- `updatedAt`

Provider/model/provenance metadata is operational evidence and must never be displayed as normal child-facing copy.

## Candidate contract

The intended production UX is one generation request producing four distinct candidate views/variants for the same character identity. Candidates are not canonical until the parent/child explicitly selects one.

Candidate requirements:

1. all four represent the same semantic character specification;
2. candidate IDs are stable within a generation batch;
3. selecting one is explicit and idempotent;
4. only one active visual canon exists per character version;
5. later image generation receives the selected reference asset and appearance descriptor;
6. changing the canon requires an explicit versioned replacement, never silent overwrite.

## Truthfulness boundary

S42 found no existing production image-generation + persisted asset path in the current character bootstrap flow. Therefore S42 must not render decorative placeholders as if they were generated candidates and must not claim visual canon selection is complete.

Until provider-backed image generation is wired, the UI presents a truthful readiness state: the character/origin can be created now, while visual identity generation will become available only when a real candidate service and durable asset store are connected.

## Future persistence boundary

When implemented, persistence must enforce:

- household/child/character scope agreement;
- one selected canon per character/canon version;
- candidate belongs to the supplied generation batch and character specification;
- no cross-tenant asset reference;
- immutable provenance for a committed canon version;
- idempotent selection/retry behavior.

## ULTEF invariants

- `CHARACTER-VISUAL-CANON-001`: a selected candidate is persisted as exactly one canonical visual reference.
- `CHARACTER-VISUAL-TRUTHFULNESS-001`: UI never presents non-generated placeholders as generated candidate output.
- `CHARACTER-VISUAL-TENANT-001`: candidate/canon references cannot cross household/child boundaries.
- `CHARACTER-VISUAL-IDEMPOTENCY-001`: retrying a selection cannot create duplicate active canons.
- `CHARACTER-VISUAL-CONTINUITY-001`: subsequent image requests use the selected reference/descriptor and never silently substitute a different identity.
