# PX-LUMI Evidence Closure Review

Date: 2026-08-09  
Status: **ACTIVE REVIEW — 8 PASS / 2 BLOCKED**

This review closes Project LUMI-specific gates only when runtime evidence satisfies every catalog assertion. It deliberately avoids creating duplicate tests simply to obtain a gate-specific filename.

## PX-LUMI-01 — Universe Continuity

Decision: **EXECUTED PASS**

Evidence composition:

- `L6-GOLDEN-001` starts a real disposable-PostgreSQL world/session, advances a generated scene, commits a world outcome, reloads persisted indirect state, completes the first session and starts a later session with the same `worldId`.
- `L5-CONTEXT-DIVERGENCE-001` stores different persisted facts for the same NPC in two worlds and proves each later generation prompt receives only the matching world-scoped fact.
- `L9-LONG-HORIZON-001` / DB-backed long-horizon execution repeatedly advances the same world across ten sessions without identity loss or uncontrolled cross-state mutation.

No new PX-01 test is required.

## PX-LUMI-02 — Character Continuity

Decision: **EXECUTED PASS**

The original audit correctly identified a missing production boundary: story generation accepted `characterId`, but the production continuity adapter did not load persisted character-domain state.

That boundary is now implemented with a bounded profile-backed character continuity snapshot and composition through the existing `StoryContinuityContextPort`.

Closure scenario:

`PX-LUMI-02-CHARACTER-RELOAD-STORY-001`

Runtime narrative:

- a synthetic household, child and character are persisted in disposable PostgreSQL;
- character `courage` begins at `0.40`, character version `1`;
- a bounded mutation persists `courage=0.82` and version `2`;
- the state is reloaded from PostgreSQL;
- `StorySceneGenerationService` invokes the production `NpcBeliefStoryContinuityContextAdapter` with the real character UUID;
- the later story prompt contains the persisted character identity, version `2` and `courage=0.82`;
- deterministic generated prose changes in response to that persisted character state.

Catalog mapping:

- stable character identity: satisfied by scoped character reload and later generation using the same character UUID;
- bounded/explainable mutation: satisfied by the explicit `courage 0.40 -> 0.82` delta and version `1 -> 2` evidence;
- persistence after reload: satisfied directly from PostgreSQL;
- later story consumes updated context: satisfied by the production continuity prompt and resulting scene narrative.

Validation:

- `ULTEF PX-02 Character Continuity #8`: **PASS**
- Head: `37588e8eafe0e23773b29dea0166009cb7b45d40`
- Artifact: `ultef-px02-character-continuity-evidence`
- Digest: `sha256:8aea7a641e5536cb241cd6ea9dcbe2450a8628f7602350327e6ce229b88922c1`
- `ULTEF Integration #393`: **PASS**, including legacy `L5-CONTEXT-DIVERGENCE-001`
- `ULTEF PX-LUMI #31`: **PASS**
- `Security Scan #572`: **PASS**
- CI validate chain: format, lint, typecheck, tests, load gate and production build **PASS**

The legacy L5 test exposed a compatibility edge case because it supplied the non-UUID placeholder `characterId: "Arin"`. The production boundary was hardened so malformed optional character identifiers do not reach the profile UUID query and instead preserve the existing NPC/world continuity path. The L5 regression then passed without weakening the valid UUID PX-02 path.

PX-LUMI-02 is closed.

## PX-LUMI-03 — Memory Coherence

Decision: **EXECUTED PASS**

`PX-LUMI-03-MEMORY-COHERENCE-001` uses disposable PostgreSQL plus the production story-continuity adapter and deterministic story generation. It proves direct observation and hearsay remain source-distinct, hearsay retains provenance, both persisted facts reach later story context, and an absent memory is neither retrieved nor fabricated.

## PX-LUMI-05 — Story Consequence

Decision: **BLOCKED — production choice→world handoff**

The repository has strong component/runtime evidence on both sides of the boundary:

- `commitChoice()` validates option availability and persists the committed choice/consequence transactionally;
- `L4-CHOICE-DIVERGENCE-001` proves distinct valid options persist into separate branch histories/consequences;
- `L4-CHOICE-WORLD-DIVERGENCE-001` proves different outcome manifests create different durable world commits/hashes/outbox effects;
- PX-LUMI-09/L6/L9 prove durable world commits and later continuity.

However no production consumer yet turns the persisted committed choice/consequence into the canonical outcome/world-commit input. The catalog requires one causal chain from selected active-scene option through committed consequence to later observed world/story state.

See `PX_LUMI_05_STORY_CONSEQUENCE_BLOCKER.md`.

## PX-LUMI-06 — Child / Household Isolation

Decision: **EXECUTED PASS**

Evidence covers foreign-household denial, persisted belief isolation, concurrent household/child/world pipelines, session/commit/idempotency separation and story-session IDOR regression. No new PX-06 test is required.

## PX-LUMI-09 — Story Outcome & World State Commit

Decision: **EXECUTED PASS**

Evidence covers validated outcome manifests, transactional/idempotent commits, materialized indirect effects, reload, retry/crash recovery, backup/restore and later continuity. No new PX-09 test is required.

## Current phase result

Closed / PASS:

- PX-LUMI-01
- PX-LUMI-02
- PX-LUMI-03
- PX-LUMI-06
- PX-LUMI-07
- PX-LUMI-08
- PX-LUMI-09
- PX-LUMI-10

Blocked by missing production boundaries:

- PX-LUMI-04 — event → bounded emotion delta → persisted emotion → decision context
- PX-LUMI-05 — persisted choice consequence → canonical outcome/world commit → later context

A blocker is not a test failure. It means ULTEF found a required Project LUMI behavior that cannot currently be proven through the production composition path without substituting a synthetic handoff.
