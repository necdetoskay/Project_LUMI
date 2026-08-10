# Sprint 53 — Character Visual Canon

Status: COMPLETE
Date: 2026-08-10

## Goal

Give the canonical LUMI character a durable, provider-independent visual identity that can be generated from existing character/world data, reviewed as candidates, selected as canon, and reused by later story/location illustration pipelines.

Sprint 53 starts the production visual pipeline. It must not reduce image generation to a transient UI action or a URL stored directly on the character.

## Canonical reference scope

Reference universe remains:

- child profile: Elif;
- player character: Lina;
- world: Işık Vadisi;
- current location after Sprint 52 reference path: Ateşböcekleri Korusu;
- story: Fısıldayan Ormandaki İlk Işık.

Lina is the first character visual-canon subject, but the data model and services must be generic for future player characters and NPCs.

## Core architecture rule

Generation and asset management are separate concerns.

Existing LUMI domain data is the source of truth for generation input. A generation request builds a reproducible visual brief from canonical character/profile/world data; the resulting image becomes a managed asset with provenance and lifecycle metadata.

The system must support generation after the underlying data already exists. Visual generation is not coupled to character creation, story generation, or seed time.

## Delivery slices

### S53-T01 — Visual identity contract

Define a provider-independent `CharacterVisualCanon` contract containing at minimum:

- subject character ID;
- visual brief/version;
- canonical appearance traits;
- style profile/reference;
- age-safe presentation constraints;
- selected asset ID;
- candidate set/generation job provenance;
- created/selected timestamps;
- lifecycle status.

A character may have generated candidates without yet having a selected canonical visual.

### S53-T02 — Managed visual asset contract

Introduce a generic managed-asset boundary suitable for later character, location, item and story-scene assets.

Asset metadata must include at minimum:

- asset ID and owner household/world scope;
- asset kind and subject reference;
- storage reference;
- MIME type/dimensions when known;
- generation provider/model;
- prompt/brief fingerprint;
- generation job ID;
- candidate index;
- generation cost/usage metadata when available;
- lifecycle state (`candidate`, `canonical`, `rejected`, `archived`);
- timestamps.

Provider URLs are provenance/input data, not the canonical persistence contract.

### S53-T03 — Reproducible character visual brief

Build the generation brief from existing LUMI data rather than free-form UI prompt text.

The brief must be deterministic/versioned and able to include:

- character name and stable physical traits;
- age/presentation constraints;
- personality/interests when visually relevant;
- world/location context when requested;
- canonical art direction;
- negative/safety constraints;
- consistency anchors for later generations.

The exact provider prompt may be adapter-specific, but the canonical visual brief must remain provider-independent and auditable.

### S53-T04 — Provider generation port

Define an image-generation port and provider adapter boundary.

Initial implementation should support the configured low-cost provider/model path without embedding provider-specific assumptions into domain/application contracts. The first adapter may target Krea 2 Medium Turbo through the configured model gateway if the repository's provider infrastructure supports it.

Required capabilities:

- one generation job -> one or more candidates;
- explicit dimensions/aspect intent;
- seed when provider supports it;
- provider/model/usage capture;
- timeout/error classification;
- safe retry/idempotency;
- no silent provider fallback that changes cost or visual semantics.

### S53-T05 — Candidate generation and selection

Provide production application services for:

1. request character visual generation;
2. persist generation job;
3. persist returned candidate assets;
4. list candidates for a character;
5. select exactly one candidate as canonical;
6. reject/archive candidates without deleting provenance;
7. replace canon while retaining visual history.

Canonical selection must be an explicit operation. Generation alone must never silently overwrite the current canon.

### S53-T06 — Asset Management foundation

Establish the parent/admin-facing Asset Management foundation as the long-term operational surface for generated media.

Sprint 53 only needs the minimum character-visual workflow:

`character -> current canon -> candidates -> generate -> inspect -> select/reject`

The architecture must leave room for later filters by character/location/item/story scene, batch generation, regeneration, cost reporting and asset lifecycle operations.

### S53-T07 — Cost-aware batch contract

Design the generation job contract so one provider request may yield a composite/grid image representing multiple requested candidates or subjects, followed by deterministic crop/split processing into managed child assets.

This capability is optional to activate in Sprint 53, but the model must not assume `one API call == one persisted asset`.

Any grid optimization must preserve:

- per-child provenance;
- crop coordinates/index;
- original composite asset linkage;
- visual-quality validation;
- ability to reject one child without rejecting siblings.

### S53-T08 — Dedicated ULTEF gate

Add DB-backed/application tests covering:

- brief determinism;
- household isolation;
- generation idempotency;
- provider failure without phantom assets;
- multiple candidates from one job;
- explicit canonical selection;
- canon replacement history;
- rejected candidate retention;
- cost/provenance capture;
- asset lookup after reload.

Provider-network calls must be mock/fake-backed in required CI gates unless a separately budgeted opt-in live-provider workflow is explicitly enabled.

## Required ULTEF evidence

Scenario family:

- `PX-LUMI-S53-BRIEF-DETERMINISM-001` — unchanged canonical character data produces the same visual brief fingerprint;
- `PX-LUMI-S53-GENERATION-IDEMPOTENCY-002` — replay of one generation command does not create a second logical job;
- `PX-LUMI-S53-CANDIDATE-PERSISTENCE-003` — generated candidates survive reload and remain attached to the correct character;
- `PX-LUMI-S53-CANON-SELECTION-004` — selecting one candidate produces exactly one active canon;
- `PX-LUMI-S53-CANON-REPLACEMENT-005` — replacement preserves prior asset/provenance history;
- `PX-LUMI-S53-PROVIDER-FAILURE-006` — failed provider execution records failure without canonical/candidate phantom state;
- `PX-LUMI-S53-ISOLATION-007` — foreign household cannot generate, read, select or reject another household's character assets;
- `PX-LUMI-S53-MULTI-ASSET-JOB-008` — one generation job can own multiple candidate assets without provenance loss.

## Acceptance criteria

1. Lina can have persisted visual candidates independently of character creation time.
2. Generation input is derived from existing canonical LUMI data through a versioned visual brief.
3. Provider/model details do not leak into the core character visual contract.
4. Generated files are represented as managed assets with durable provenance.
5. One generation job may produce multiple candidate assets.
6. Exactly one candidate can be explicitly selected as Lina's active canonical visual.
7. Replacing the canon preserves history; rejecting a candidate does not destroy provenance.
8. Generation retry is idempotent and provider failures do not create phantom canonical assets.
9. Household/world authorization and isolation are enforced for generation and asset operations.
10. Cost/usage metadata is persisted when the provider supplies it.
11. The design supports later composite/grid generation without assuming one request equals one asset.
12. Required CI uses deterministic fake-provider tests; live generation is opt-in and budget controlled.
13. CI, Integration, Security and dedicated S53 ULTEF gates are green before COMPLETE.

## Completion evidence

Sprint 53 closed on 2026-08-10 after the final branch head passed the full CI/regression matrix, the dedicated DB-backed S53 lifecycle gate, opt-in live Krea generation, production-like fresh-volume Docker Compose cold start, migration replay/idempotency, web/worker health, restart persistence, and real-browser parent login -> `/app/assets` verification against the Compose artifact.

## Non-goals

- full illustrated Story Reader;
- location visual canon (Sprint 54+);
- automatic illustration for every generated story;
- unrestricted child-facing generation UI;
- deleting provenance/history when replacing an image;
- binding the domain model permanently to Krea, OpenRouter or any single provider;
- requiring image generation during character/story creation.

## Exit condition

Sprint 53 is COMPLETE: Lina can receive reproducibly generated and persisted visual candidates from already-existing canonical data, a parent/admin can explicitly select one as durable character visual canon, reload/restart preserves the state and provenance, and the flow is provider-independent, isolated and ULTEF-proven.
