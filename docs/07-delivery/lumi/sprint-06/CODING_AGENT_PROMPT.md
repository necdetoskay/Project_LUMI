# Sprint 06 Coding Agent Prompt

Bu promptu farklı bir kod ajanına ver. Amaç Sprint 06 - Character Domain kapsamını uygulamak; NPC autonomy, world simulation veya story engine kapsamına taşma.

## Görev

Project LUMI reposunda Sprint 06 Character Domain kapsamını uygula.

Önce şu dosyaları oku:

- `docs/00-project/context/CURRENT_STATUS.md`
- `docs/07-delivery/lumi/sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md`
- `docs/07-delivery/lumi/sprint-06/SPRINT_SPEC.md`
- `docs/07-delivery/lumi/sprint-05/IMPLEMENTATION_REPORT.md`
- `docs/03-domain-design/characters/008-Character-Foundation.md`
- `docs/03-domain-design/characters/009-Personality-Vector-System.md`
- `docs/03-domain-design/characters/010-Character-Growth-and-Personality-Evolution.md`
- `docs/03-domain-design/characters/011-NPC-Life-Cycle.md`
- `docs/03-domain-design/characters/012-NPC-Needs-Goals-and-Motivations.md`
- `docs/03-domain-design/characters/014-Character-Roles-and-Archetypes.md`
- `docs/03-domain-design/characters/015-Influence-Vector-System.md`
- `docs/03-domain-design/characters/character-origin-and-world-bootstrap.md`
- `docs/03-domain-design/simulation/seeded-vector-bootstrap.md`
- Existing Sprint 04 character bootstrap code under `packages/profiles/src/application`, `packages/profiles/src/domain`, `packages/profiles/src/db`, and `apps/web/app/api/characters*` / `character-bootstrap*`.

## Mevcut repo gerçekleri

- Sprint 04 already created a minimum character bootstrap foundation inside `packages/profiles`.
- Existing tables include `profile.lumi_characters`, `profile.character_origin_packages`, and `profile.first_run_handoff_consumptions`.
- Existing API surface includes `/api/characters`, `/api/characters/[id]`, and `/api/character-bootstrap/*`.
- Sprint 05 added `@lumi/logger`, `proxy.ts`, and observability wrappers. New/modified API routes must stay wrapped and keep `x-correlation-id` + metrics behavior.
- Do not create a disconnected duplicate character model. Either extend the current `packages/profiles` character foundation or introduce `packages/characters` only with a clear migration/export plan that preserves existing API contracts.

## Sprint 06 scope

Implement task IDs:

- S06-T01: Character aggregate and invariants.
- S06-T02: Character, trait, emotion and goal schema.
- S06-T03: Scoped repositories/use cases with Family Space and Child Profile isolation.
- S06-T04: Character APIs with contract and authorization tests.
- S06-T05: Domain events and audit for character mutations.
- S06-T06: Character architecture and acceptance traceability docs.

## P0 rules

- Child avatar and NPC must be separated at domain level.
- Child avatar cannot autonomously make choices while the child is absent.
- NPC planning/emergent autonomy is out of scope.
- Trait, emotion, needs, goals and influence must not be collapsed into a single scalar.
- Trait changes must be bounded, evidence-linked and append-only history-backed.
- Relationships are directional: A to B is not the same as B to A.
- A character can have only one active location at a time.
- Every server-side read/write must enforce Family Space and Child Profile scope.
- All new API routes must use Sprint 05 observability wrappers.
- All migrations must be additive and must not break existing Sprint 04 bootstrap data.

## Expected implementation details

1. Domain model:
   - Add/extend character aggregate for child avatar and NPC.
   - Model lifecycle, active location reference, optimistic version, character type/subtype, accepted origin package reference, seed manifest reference.
   - Add typed vector validation for traits, emotions, needs/goals/influence.
   - Reject invalid vector dimensions, NaN, out-of-range values and unknown keys.

2. Persistence:
   - Add additive migration(s) for trait state/history, emotion state/history, goals/needs, directional relationships, audit/domain events, optimistic version, and active location invariant.
   - Preserve existing `lumi_characters` rows and bootstrap contracts.
   - Add repository methods with scope checks and optimistic conflict handling.

3. Application/use cases:
   - Create/read/update child avatar and NPC flows.
   - Trait delta operation must require evidence and enforce bounded changes.
   - Emotion/goal updates must validate shape and create audit/event records.
   - Location mutation must enforce single active location and optimistic version.

4. APIs:
   - Extend existing `/api/characters` routes where possible instead of creating duplicate endpoints.
   - Add/update contract tests for create/read/update, invalid vectors, authorization, cross-family/cross-child denial, version conflict and mutation event/audit.
   - Keep response envelopes consistent with existing API style.

5. Events/audit:
   - Character mutation produces immutable domain event/audit record.
   - Event payload must not log raw child-sensitive details beyond scoped identifiers and safe metadata.

6. Documentation:
   - Create `docs/07-delivery/lumi/sprint-06/IMPLEMENTATION_REPORT.md`.
   - Include Task ID completion, changed files, migrations, API contracts, test results, acceptance traceability, known risks and rollback plan.

## Required tests

At minimum:

- Domain unit tests for aggregate invariants, child avatar vs NPC separation, trait vector validation, emotion vector validation, bounded trait delta and evidence requirement.
- PostgreSQL integration tests for schema/repositories, optimistic version conflict, active location invariant and append-only history.
- Authorization/isolation tests for cross-family and cross-child access denial.
- API contract tests for create/read/update and mutation errors.
- Event/audit tests proving character mutation records correct immutable event/audit rows.
- Observability regression tests if any new/changed API route bypasses wrappers.

## Commands to run

```powershell
pnpm --filter @lumi/web lint
pnpm --filter @lumi/web typecheck
pnpm --filter @lumi/web test
pnpm --filter @lumi/logger typecheck
pnpm --filter @lumi/logger test
pnpm --filter @lumi/profiles typecheck
pnpm --filter @lumi/profiles test
pnpm build
```

If DB-gated tests are added, document exact env flags and whether they were run or skipped. Do not claim root `pnpm lint` is clean unless the pre-existing `@lumi/profiles` lint debt is actually fixed.

## Review output required

When done, produce `docs/07-delivery/lumi/sprint-06/IMPLEMENTATION_REPORT.md` with:

- Completed Task IDs.
- Changed files.
- Migration summary and rollback notes.
- API contract changes.
- Character invariant evidence.
- Scope/isolation evidence.
- Domain event/audit evidence.
- Commands run and exact results.
- Acceptance criteria traceability.
- Known risks/deferred work.

After that, Codex will review the implementation and write follow-up prompts until Sprint 06 can be closed.