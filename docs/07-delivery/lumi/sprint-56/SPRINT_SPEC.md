# Sprint 56 — Image Generation Platform

Status: IN PROGRESS
Date: 2026-08-11
Parent roadmap: `docs/07-delivery/lumi/SAAS_PORTABILITY_ASSET_PLATFORM_ROADMAP.md`
Tracking issue: #91

## Goal

Move image generation out of the character-specific Sprint 53 implementation and into a provider/model-neutral platform that can generate managed visual candidates for character, NPC, location, item, and story-scene subjects while enforcing explicit budget, capability, provenance, and paid-live-test rules.

## Product boundary

Sprint 56 owns generation planning and accounting. Sprint 55 remains the canonical asset metadata/lifecycle/canon layer and Sprint 54 remains the binary object-storage layer.

The generation platform must not own subject authorization semantics, canon selection, or provider-specific storage URLs. It produces candidate binaries plus provenance/cost evidence and hands those candidates to the generic managed-asset boundary.

## Canonical generation model

A generation request contains:

- household + managed-asset subject scope;
- asset kind;
- normalized prompt/brief data;
- requested candidate count;
- requested aspect ratio/resolution;
- optional preferred provider/model;
- maximum allowed estimated cost for the request.

A provider advertises capabilities rather than being selected by domain code. Capabilities include:

- supported image sizes/aspect ratios;
- maximum images per provider request;
- whether native multi-image output is supported;
- whether grid generation is allowed;
- deterministic pricing information when known;
- provider/model identifiers used only as infrastructure provenance.

## Generation strategies

### Direct

One or more provider calls return independent candidate images. This remains the compatibility path for OpenRouter/Krea.

### Native batch

One provider request returns multiple independent images when the provider/model capability explicitly supports it.

### Grid + split

One provider request intentionally renders an N-cell grid and deterministic post-processing splits the result into N candidate assets.

Grid mode is never assumed to be cheaper. It is eligible only when:

1. provider/model capability allows it;
2. requested candidate count maps to a supported deterministic layout;
3. estimated total request cost is lower than the direct plan by the configured minimum saving threshold;
4. split/post-processing can prove exact crop dimensions;
5. quality evaluation does not show unacceptable cross-cell contamination or identity degradation.

## Budget and accounting

Every paid plan must be estimated before provider execution.

Policy levels:

- request cap — caller-supplied maximum estimated spend;
- runtime cap — deployment-wide maximum allowed spend per generation job;
- live-test cap — stricter opt-in cap for CI/manual provider tests.

A job exceeding any applicable cap is rejected before a provider call.

Actual/estimated cost evidence is stored in PostgreSQL as generation accounting metadata; no API key or secret is persisted.

## Tasks

### S56-T01 — Generic provider capability contract

- Add provider/model-neutral image request/result types.
- Add capability descriptors and provider registry/selection.
- Preserve OpenRouter/Krea behind an adapter.
- Keep provider SDK/API concepts out of subject/domain services.

### S56-T02 — Budget and cost policy

- Add deterministic preflight cost estimation.
- Enforce request/runtime/live-test caps.
- Persist job-level estimated/actual cost evidence.
- Reject unknown paid pricing unless explicitly permitted by policy.

### S56-T03 — Generic generation jobs

- Add generic generation jobs scoped to managed-asset subjects.
- Preserve idempotency.
- Record strategy, provider/model, prompt fingerprint, candidate count, status, usage and cost evidence.
- Keep generation jobs separate from canon state.

### S56-T04 — Candidate/batch generation

- Generate multiple managed-asset candidates from one logical job.
- Support direct fan-out and native batch according to capability.
- Persist each candidate through the portable object-storage boundary then register it in Sprint 55 managed assets.

### S56-T05 — Grid generation experiment

- Add deterministic grid layouts for supported candidate counts.
- Add exact split-plan validation.
- Compare estimated direct versus grid cost.
- Keep grid disabled unless savings and quality policy make it eligible.
- Add deterministic tests for layout, crop boundaries, cost selection and fallback.

### S56-T06 — Character compatibility migration

- Preserve existing character generation API/UI behavior.
- Route new character generation through the generic generation platform where practical.
- Keep S53 legacy tables synchronized until parity is proven and a later cleanup is explicitly approved.

### S56-T07 — Paid live verification

- Live provider tests remain opt-in via marker/manual execution.
- Enforce a hard live-test budget cap before the call.
- Record model/provider/cost evidence without leaking secrets.
- Never call a paid provider from ordinary CI.

## Invariants

1. Provider/model selection is infrastructure policy, not character/NPC/location/item/story domain logic.
2. No paid provider call occurs before budget preflight succeeds.
3. Unknown pricing fails closed for paid execution unless policy explicitly allows it.
4. Candidate count is bounded.
5. Every generated candidate has durable provenance linking it to its generation job.
6. Object bytes remain outside PostgreSQL.
7. Generation does not implicitly select canon.
8. Ordinary CI uses fake/deterministic providers only.
9. Grid mode must always have a direct-generation fallback.
10. Existing Sprint 53 character visual data remains valid.

## Verification

Dedicated `ULTEF S56 Image Generation Platform` must prove at minimum:

- provider capability selection;
- direct and native-batch planning;
- budget rejection before provider invocation;
- deterministic cost estimation;
- idempotent generation jobs;
- generic managed-asset candidate registration;
- deterministic grid layout/split planning;
- grid cost threshold selection and direct fallback;
- character compatibility path;
- profile migration replay/idempotency.

Normal CI, Security, Integration, S53, S55 and active PX regressions must remain green.

## Exit criteria

Sprint 56 is COMPLETE when:

- generic image generation contracts and provider adapter are merged;
- budget/cost policy and accounting are merged;
- generic candidate/batch generation is proven;
- grid experiment has deterministic cost/quality-safe enablement rules and remains optional;
- character generation compatibility is proven;
- paid live tests are opt-in and budget-capped;
- dedicated S56 ULTEF and standard regression gates are green;
- Issue #91 Sprint 56 checklist is updated.
