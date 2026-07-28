# Sprint 03 - Household and Child Profiles

**Sprint ID:** LUMI-S03
**Version:** 1.1.0
**Status:** Completed
**Depends On:** Sprint 02 exit gate or explicit human approval to continue with a documented partial-close decision
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)

## Activation Note

This specification is implementation-ready in content, but it is not automatically active.
Per the sprint standard, Sprint 03 may start only when either:

- Sprint 02 exit criteria are closed, or
- a human explicitly approves moving forward and records that Sprint 02 is being parked with known gaps.

This file defines Sprint 03 scope and constraints. It does not silently reopen or complete Sprint 02.

## Goal

Enable the parent to create a Family Space, manage an isolated household, and safely manage age-appropriate child profiles inside that space.

## Implementation Snapshot Intent

Sprint 03 should produce the first usable parent-side profile foundation after authentication:

- one authenticated parent can create or initialize a Family Space / household;
- the parent can create, view, update and archive child profiles within that scope;
- every repository and API path enforces server-side Family Space ownership;
- onboarding can continue from auth into profile creation and profile selection;
- the selected child profile can hand off a first-run character intent to later sprints without creating story, world or character records yet.

## In Scope

- Family Space, household, membership and ownership model;
- child profile create/read/update/archive;
- display name, age band, interests and experience preferences;
- parent policy, content boundary and time-limit preferences;
- parent/guardian ownership and role checks;
- onboarding UI and profile switcher;
- first-run character type entry point and manual/Auto origin choice handoff;
- profile audit history and soft archive;
- isolation, validation and API contracts.

## Out of Scope

- unnecessary real-world personally sensitive child data;
- voice biometric or sensitive health data;
- character, world and story creation;
- recommendation or learning engine;
- NPC Emergent Interaction Engine;
- long-term analytics, advanced parent dashboards or cross-household sharing.

## Minimum Data Model for Sprint 03

Sprint 03 must stay narrow and implement only the minimum profile foundation needed for the first visible product slice.

Required persistence concepts:

- `family_spaces` or `households` as the authoritative parent-owned scope root;
- `household_members` or equivalent membership table with ownership role state;
- `child_profiles` with soft-archive support;
- `child_profile_preferences` and/or validated JSONB preference fields;
- `parent_policy` or equivalent parent-controlled safety/settings record;
- append-only audit trail for parent policy and profile lifecycle changes.

The exact table names may follow the canonical persistence documents, but Sprint 03 must not introduce story, world, character, inventory or simulation tables unless they are strictly required as foreign-key placeholders already approved elsewhere.

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S03-T01 | Household/profile domain model | `packages/profiles` | unit |
| S03-T02 | Scoped repositories and migrations | database/profile | PostgreSQL integration |
| S03-T03 | Household/child profile APIs | `apps/web/app/api` | contract + authorization |
| S03-T04 | Parent onboarding and profile UI | `apps/web` | component + E2E |
| S03-T05 | Parent policy validation | profiles/policy | unit + security |
| S03-T06 | Privacy and lifecycle documentation | `docs/` | review |

## Task Details

### S03-T01 - Household/profile domain model

- **Objective:** Define the core aggregates, value objects and validation rules for Family Space / household and child profiles.
- **Data impact:** No direct database writes in the domain layer.
- **API impact:** Supplies contracts consumed by repositories and route handlers.
- **Security impact:** Ownership, archive state and policy constraints must be expressible in domain rules.
- **Acceptance evidence:** Unit tests cover valid profile creation, invalid age-band/preference combinations and archive-state behavior.
- **Rollback:** Domain types and services can be reverted without schema rollback if no migration has shipped.

### S03-T02 - Scoped repositories and migrations

- **Objective:** Add the minimum PostgreSQL schema and repository layer required to persist household, membership, child profile and parent policy state.
- **Data impact:** Additive migrations only; no destructive rewrite of prior auth tables.
- **API impact:** Repository interfaces exposed to application services only.
- **Security impact:** Every read/write path must enforce Family Space scope server-side.
- **Acceptance evidence:** Integration tests prove ownership isolation, archive behavior and migration success on a clean database.
- **Rollback:** Prefer forward-fix; additive tables may be left in place if rollback would risk data loss.

### S03-T03 - Household/child profile APIs

- **Objective:** Expose authenticated endpoints for create/read/update/archive and profile selection flows.
- **Data impact:** Creates and mutates household/profile records through application services.
- **API impact:** New route handlers under `apps/web/app/api` with stable request/response contracts.
- **Security impact:** Client-sent `familySpaceId`, `ownerId` or role claims are never trusted.
- **Acceptance evidence:** Contract and authorization tests reject cross-family access and invalid payloads.
- **Rollback:** Disable the new routes and preserve existing data if an emergency rollback is required.

### S03-T04 - Parent onboarding and profile UI

- **Objective:** Give the authenticated parent a usable flow to initialize household/profile state and switch between active child profiles.
- **Data impact:** No direct client-side persistence outside approved APIs.
- **API impact:** Consumes Sprint 03 APIs only.
- **Security impact:** Protected UI cannot reveal data from another Family Space even if the URL or client state is manipulated.
- **Acceptance evidence:** Component and E2E tests cover create, select, archive and responsive accessibility paths.
- **Rollback:** UI can be hidden behind auth-gated routing while keeping persisted records intact.

### S03-T05 - Parent policy validation

- **Objective:** Validate parent-controlled boundaries such as age band, content boundary and time limits before persistence.
- **Data impact:** Writes only schema-validated policy state.
- **API impact:** Shared validation contracts used by forms and routes.
- **Security impact:** Guardian role limits cannot exceed parent-owned policy authority.
- **Acceptance evidence:** Unit and security tests reject invalid or privilege-escalating combinations.
- **Rollback:** Policy validation rules may be reverted independently if schema shape remains compatible.

### S03-T06 - Privacy and lifecycle documentation

- **Objective:** Document data lifecycle, archive semantics, ownership assumptions and audit expectations.
- **Data impact:** Documentation only.
- **API impact:** Clarifies expected contracts and retention behaviors.
- **Security impact:** Documents privacy boundaries and operational review points.
- **Acceptance evidence:** Updated sprint completion artifacts and privacy notes reviewed against implementation.
- **Rollback:** Documentation can be revised without runtime impact.

## Functional and Technical Requirements

- Every child profile belongs to exactly one Family Space.
- Server-side authenticated membership produces the Family Space scope.
- Client `familySpaceId`, `householdId`, `ownerId` or role claims are not authority inputs.
- Age band must be used unless a direct numeric age is explicitly required by an approved downstream contract.
- Archive removes a profile from active selection but does not delete its history.
- Parent policy changes produce append-only audit entries.
- JSONB preferences may be persisted only after schema validation.
- Route handlers and React components must not access persistence directly.
- Sprint 03 must remain compatible with Sprint 04 PostgreSQL domain-core follow-up work.

## API and Handoff Contract

Sprint 03 owns the child-facing entry point for first-run character setup, but not character or world creation itself.

At minimum, Sprint 03 must define a validated handoff payload containing:

- `childProfileId`
- `characterType`
- `originMode` (`manual` or `auto`)
- optional validated preference hints relevant to first-run setup

This payload may be stored as a short-lived onboarding selection, a validated profile-associated draft, or another explicitly documented mechanism. The handoff contract must not create final world, character or story rows in Sprint 03.

## Acceptance Criteria

- Parent can manage its own household and child profiles.
- Access with a profile ID from another Family Space is rejected on every endpoint.
- Guardian permissions cannot exceed parent policy boundaries.
- Invalid age/preference/policy combinations cannot be saved.
- An archived profile cannot start a new session, but its history remains available.
- Onboarding supports keyboard, screen-reader and responsive usage.
- Isolation tests pass at repository and API level.
- First-run character intent can be captured and handed off without creating downstream domain records.

## Quality Gate and Rollback

Required before Sprint 03 can be called complete:

- unit tests for domain and validation rules;
- PostgreSQL integration tests for repository behavior and ownership isolation;
- API authorization and contract coverage;
- onboarding component/E2E coverage for create/select/archive flows;
- migration verification on a clean database and on top of the current auth schema;
- updated completion report with privacy, ownership and evidence mapping.

Migrations must be additive. Archive behavior must be reversible. If rollback would risk profile data loss, use a forward-fix strategy and disable the affected UI/API surface instead of dropping live data.

## Coding Agent Mission

Implement only the household and child profile foundation.
Do not create story, character or world domain tables in this sprint.
Do not pull backlog systems into scope.

## Character Origin Handoff

Sprint 03 owns the entry point where the child selects a broad character type and chooses either manual setup or Auto generation.

Sprint 03 does not create the final world. It hands the selected intent to the Character Domain and World Bootstrap sprints using the canonical first-run documents:

- [First-Run Character Onboarding](../../../02-product/experience/first-run-character-onboarding.md)
- [Character Origin and World Bootstrap](../../../03-domain-design/characters/character-origin-and-world-bootstrap.md)
