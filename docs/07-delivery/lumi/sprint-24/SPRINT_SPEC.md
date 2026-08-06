# Sprint 24 — NPC Emergent Interaction (Foundation + Rumor/Invitation)

**Sprint ID:** LUMI-S24
**Version:** 0.1.0
**Status:** Planned / Agent-ready
**Depends On:** Sprint 13 NPC decision foundation, Sprint 23 outbox propagation
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)
**Backlog Source:** `docs/08-backlog/lumi/npc-emergent-interaction-engine.md`

## Goal

Build the **NPC Emergent Interaction foundation** and deliver two interaction
types end-to-end: **rumor** and **invitation**. NPCs surface safe, meaningful,
evidence-grounded spontaneous interaction opportunities to the child, governed
by a deterministic rule engine (no LLM-controlled scoring), child-safety and
parent-policy filters, cooldown/novelty/expiry, and an explainable delivery.

This closes the S13 gap: NPCs that only react when spoken to become agents
that proactively offer rumors and invitations grounded in what they actually
perceive, know, and hold.

## Scope Decision (product owner approved)

**In scope:** foundation + `rumor` + `invitation`.
**Deferred to follow-up sprints:** `gift`, `warning`, `quest_seed`,
`social_visit`, `information_share`.

## Principles (inherited from `@lumi/npc-intelligence` AGENTS.md)

- **Determinism.** Same state + policy + seed → same candidates, scores,
  selection, delivery.
- **Information access.** An NPC only surfaces a rumor it actually holds a
  belief about; it can never share another family's data (`CrossFamilyAccessError`).
- **No LLM-controlled scoring.** Opportunity selection is a validated, versioned
  weight policy. An LLM may draft the surface text, but fitness + delivery are
  the rule engine's decision.
- **Safety first.** Parent/safety policy filters opportunity types and marks
  candidates before scoring; blocked opportunities are eliminated early.
- **Child choice.** An opportunity is a *proposal*; the child can accept,
  decline, or defer. Declining is never punished; NPCs never guilt-trip.
- **Explainable.** Every opportunity carries a trace: why this NPC, why this
  type, what evidence, which gates passed.

## Candidate Flow (from backlog, scoped)

1. Select relevant NPCs (perception window).
2. Generate intent candidates from needs/goals/beliefs/world events.
3. Apply relationship + proximity + role targeting.
4. Apply source/target/pair cooldown + novelty + expiry checks.
5. Verify information access (belief existence, no cross-family).
6. Apply child-safety + parent-policy filters.
7. Build a time-bounded interaction opportunity.
8. Deliver via an interaction inbox (accept/decline/defer).

## Reused Foundation

- `@lumi/npc-intelligence`: perception window, belief access, decision context,
  seeded RNG, safety components, deterministic utility scoring.
- `@lumi/story` S23 outbox: interaction intents are propagated idempotently.

## In Scope

- **Opportunity domain**: `InteractionOpportunity` (type, source NPC, target
  child, evidence, cooldown keys, novelty, expiry, status).
- **Opportunity generation**: deterministic candidate generation for `rumor`
  and `invitation` from perceived beliefs + relationships + proximity.
- **Multi-dimensional scoring**: relationship relevance, spatial proximity,
  goal alignment, information confidence, urgency, novelty, repetition
  penalty, safety risk → deterministic weighted sum (versioned policy).
- **Cooldown / novelty / expiry**: source/target/pair cooldown ledger, novelty
  score, expiry re-evaluation.
- **Safety + parent policy**: filter opportunity kinds per policy before
  scoring; blocked candidates eliminated.
- **Delivery inbox**: `InteractionOpportunity` rows with `proposed / accepted /
  declined / deferred / expired` statuses; idempotency.
- **Observability**: opportunity trace (why this NPC/type/evidence/gates).

## Out of Scope

- `gift`, `warning`, `quest_seed`, `social_visit`, `information_share` types.
- NPC-to-NPC rumor propagation chains (separate follow-up).
- Rumor confidence decay over hops (follow-up).
- Story-hook conversion of accepted opportunities (follow-up, touches `@lumi/story`).

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S24-T01 | Opportunity domain + statuses | `@lumi/npc-intelligence` | unit: domain invariants |
| S24-T02 | Opportunity generation (rumor + invitation) | `@lumi/npc-intelligence` | unit: determinism, info-access |
| S24-T03 | Multi-dimensional scoring policy | `@lumi/npc-intelligence` | unit: weighted sum, safety elimination |
| S24-T04 | Cooldown/novelty/expiry ledger | `@lumi/npc-intelligence` | unit + guarded integration |
| S24-T05 | Safety + parent policy filter | `@lumi/npc-intelligence` | unit: blocked eliminated before scoring |
| S24-T06 | Delivery inbox (proposed/accepted/…) + idempotency | `@lumi/npc-intelligence` | unit + guarded integration |
| S24-T07 | Opportunity trace (observability) | `@lumi/npc-intelligence` | unit: sanitizeTrace-style |
| S24-T08 | Backlog validation + evidence | `docs/07-delivery/lumi/sprint-24/` | scenario matrix green |

## Requirements

- No LLM writes world state or inventory; opportunities are evidence-grounded.
- Household + child isolation enforced at every boundary.
- Cooldown ledger is household-scoped and idempotent.
- Expired opportunities never silently become active tasks.
- No real child data in fixtures/tests.

## Acceptance Criteria

- [ ] A child can receive a `rumor` or `invitation` opportunity grounded in
      NPC belief + relationship + proximity.
- [ ] Same input + seed produces the same opportunity set (determinism).
- [ ] A parent-blocked opportunity type is never delivered.
- [ ] Duplicate delivery is idempotent (same cooldown key → once).
- [ ] Child accept/decline/defer transitions persist correctly.
- [ ] Opportunity trace explains why it was delivered / blocked / expired.
- [ ] All source green: `format:check | lint | typecheck | test | build`.

## Risks

- `@lumi/npc-intelligence` has no cooldown/expiry persistence yet — the ledger
  needs a new port + repository (bounded, household-scoped).
- Opportunity delivery overlaps `@lumi/story` outbox — reuse S23 propagation
  discipline, not a parallel mechanism.
- Multi-dimensional scoring must stay bounded (no free-form LLM scoring);
  policy is versioned.

## Validation

- `pnpm --filter @lumi/npc-intelligence lint | typecheck | test`
- Integration behind `NPC_TEST_ENABLE_DESTRUCTIVE=true` guard.
- `pnpm build` + `node scripts/check-mojibake.mjs` green.
