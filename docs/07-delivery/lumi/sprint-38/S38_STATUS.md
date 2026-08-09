# Sprint 38 Status — COMPLETE

Date: 2026-08-09
PR: #50
Green implementation baseline: `9ede03c19ec04f143518891a34369038404d70a7`

## Delivered

- Added a tenant-scoped Story template authoring service on top of the canonical `StoryDefinition` and `StoryVersion` model.
- Added automatic next-version numbering from the existing definition history.
- Added revision creation by cloning the selected/current published graph while generating independent scene and transition identities.
- Added revision creation from an explicitly authored replacement graph.
- Reused canonical `saveSceneGraph` validation, content hashing and freeze semantics; no parallel template state model was introduced.
- Added atomic promotion semantics: publishing a new revision retires the previously active published revision before moving the definition current-version pointer.
- Kept published/retired versions immutable; corrections require a new revision.
- Added replay-safe publication of an already-current published revision.
- Added parent-authenticated, household-scoped web endpoints for revision history, revision creation and publication.
- Added fail-closed household and source-version scope checks.

## ULTEF production evidence

Scenario: `PX-LUMI-S38-TEMPLATE-VERSIONING-PROD-001`

Result: **PASS**

Environment: disposable PostgreSQL 17 with real profile/world/story migrations and production repository/application code. No external provider or LLM call is used, so provider cost is zero.

Verified:

1. v1 baseline graph can be created, frozen and published.
2. v2 can clone the canonical v1 graph with matching authored content and independent persisted identities.
3. publishing v2 retires v1 and moves the definition current-published pointer to v2.
4. published v2 cannot be mutated through the canonical graph-save path.
5. v3 can be created from a replacement authored graph and promoted.
6. publishing v3 retires v2 while preserving immutable history.
7. foreign-household authoring is rejected.

## Green implementation baseline

All required gates passed on implementation head `9ede03c19ec04f143518891a34369038404d70a7`:

- ULTEF S38 Template Versioning #11 — PASS
- ULTEF S37 Hook Reader #24 — PASS
- ULTEF S36 Quest Reward #44 — PASS
- ULTEF S35 Outbox Worker #54 — PASS
- ULTEF PX-LUMI #121 — PASS
- ULTEF PX-02 Character Continuity #98 — PASS
- ULTEF PX-04 Emotional Consistency #87 — PASS
- ULTEF PX-05 Story Consequence #80 — PASS
- Security Scan #668 — PASS, including dependency audit, gitleaks, web image build and Trivy
- ULTEF Integration #483 — PASS, including DB integration, long-horizon/recovery/tenant isolation and continuity regressions
- CI #724 validate — PASS: format, lint, typecheck, full test suite, load gate and build
- CI #724 Build Artifact — PASS: web container image artifact

## Closeout

Sprint 38 exit criteria are satisfied. The closeout documentation head must repeat the required gate matrix successfully before PR #50 is merged.

## Next boundary

The backend authoring/versioning boundary is now ready for a visual authoring surface. That UI should consume these APIs and immutable-version semantics instead of introducing direct database mutations or a separate editor-only state model.
