# Project LUMI — PX-LUMI Gate Catalog

Status: Canonical draft for Sprint 00
Date: 2026-08-08

PX-LUMI gates are Project LUMI-specific behavioral verification extensions layered on top of generic ULTEF L0-L9. They do not replace generic levels; they describe LUMI-specific truths that must be proven.

Every stateful PX-LUMI scenario must emit execution narrative evidence generated from actual runtime events and state snapshots.

## PX-LUMI-01 — Universe Continuity

Purpose: prove that a universe/world keeps valid identity and state across story sessions, commits and reloads.

Typical owning levels: L4, L6, L7.

Minimum assertions:
- same world identity after reload;
- committed world facts persist;
- unrelated state is not mutated;
- later sessions observe prior committed state when relevant.

Required narrative evidence:
- world name/id;
- relevant initial facts;
- events that changed the world;
- before/after state delta;
- reload observation.

## PX-LUMI-02 — Character Continuity

Purpose: prove that child/player character identity, traits, inventory, relationships and relevant memories persist consistently.

Typical owning levels: L1, L4, L6.

Minimum assertions:
- character identity remains stable;
- state changes are bounded and explainable;
- inventory/relationship/trait mutations persist after reload;
- later scenes receive correct character context.

Required narrative evidence:
- character name;
- pre-test state summary;
- choice/action timeline;
- state mutations;
- post-reload state.

## PX-LUMI-03 — Memory Coherence

Purpose: verify that memories are created, classified, linked and retrieved coherently.

Typical owning levels: L3, L4, L6, L7.

Minimum assertions:
- correct subject/source/event linkage;
- confidence/source semantics are valid;
- direct memory and hearsay are distinguishable;
- relevant memories can influence later behavior without fabricating nonexistent memories.

Required narrative evidence:
- who learned what;
- source NPC/event;
- memory type;
- confidence before/after when changed;
- retrieval/use in later decision or story context.

## PX-LUMI-04 — Emotional Consistency

Purpose: verify that emotional vector changes follow events and affect later decisions in a plausible, rule-consistent way.

Typical owning levels: L1, L3, L4, L5.

Minimum assertions:
- bounded emotion vector;
- event causes intended directional delta;
- unrelated dimensions do not change unexpectedly;
- downstream decision/utility receives updated state.

Required narrative evidence:
- triggering event;
- emotion vector before/after;
- downstream consequence.

## PX-LUMI-05 — Story Consequence

Purpose: prove that meaningful player choices and story outcomes produce durable, causally related consequences.

Typical owning levels: L4, L5, L6.

Minimum assertions:
- selected choice is valid for the active scene;
- resulting consequences match choice/outcome rules;
- outcome is committed once;
- later world/story context can observe the consequence.

Required narrative evidence:
- presented options;
- selected choice;
- resulting story/world events;
- committed consequence;
- later observation.

## PX-LUMI-06 — Child / Household Isolation

Purpose: guarantee that one household/child cannot read or mutate another household/child state.

Typical owning levels: L0, L1, L2, L4, L7, L9.

Minimum assertions:
- ownership gates reject cross-household access;
- child-specific characters/worlds/sessions remain isolated;
- evidence/reporting contains no leaked child data.

Required narrative evidence:
- synthetic household/child aliases only;
- attempted cross-boundary action;
- denial result;
- proof that target state is unchanged.

## PX-LUMI-07 — World Time Progression

Purpose: verify background simulation and elapsed-time rules, including the configured bounded progression/freeze behavior.

Typical owning levels: L1, L3, L4, L6, L7.

Minimum assertions:
- time never moves backward;
- progression respects elapsed time and relevance rules;
- relevant injured/active entities may evolve;
- irrelevant entities are not needlessly simulated;
- long inactivity beyond configured bound does not produce uncontrolled world drift.

Required narrative evidence:
- start/end simulated time;
- elapsed duration;
- entities considered/ignored;
- state changes and reasons.

## PX-LUMI-08 — NPC Background Life

Purpose: verify autonomous NPC routines, intents, interactions and rumor/opportunity behavior while preserving constraints and continuity.

Typical owning levels: L3, L4, L6, L7.

Minimum assertions:
- NPC action is derived from valid state/context;
- autonomous action is idempotent where required;
- rumor propagation preserves source/confidence semantics;
- opportunities/hooks created from NPC life are traceable.

Required narrative evidence:
- NPC identity;
- relevant state/intent;
- chosen autonomous action;
- NPC-to-NPC/player interaction;
- rumor/opportunity/hook chain if created.

## PX-LUMI-09 — Story Outcome & World State Commit

Purpose: verify end-of-story state reconciliation, validation, idempotency and persistence.

Typical owning levels: L2, L4, L6, L7.

Minimum assertions:
- outcome manifest is valid;
- expected state deltas are applied;
- invalid/duplicate outcomes do not corrupt state;
- commit is transactional where required;
- reload produces the committed state;
- related NPC, relationship, inventory, quest, memory and world-event effects are included when applicable.

Required narrative evidence:
- snapshot A;
- outcome/event list;
- commit steps;
- snapshot B;
- expected vs actual delta;
- idempotent second-apply result;
- reload verification.

## PX-LUMI-10 — Age Appropriateness

Purpose: verify that generated/interpreted story output respects the active child age band and safety constraints.

Typical owning levels: L0, L5, L8, L9.

Minimum assertions:
- active age band is present in generation/evaluation context;
- prohibited or developmentally inappropriate content is rejected/flagged;
- language complexity remains within expected band according to configured rubric;
- real-provider model changes are re-evaluated.

Required narrative evidence:
- synthetic age band;
- generation/evaluation rubric version;
- relevant output excerpt/fingerprint subject to safe retention rules;
- metric/judge decisions and reasons.

## Gate evidence rule

For PX-LUMI-01, 02, 03, 04, 05, 07, 08 and 09, a PASS without a meaningful timeline and state-delta evidence is invalid.

A valid human-readable result must answer:

1. What scenario did we create?
2. Who/what participated?
3. What actually happened?
4. What changed?
5. What did we expect?
6. What did we observe?
7. Why did the gate PASS, WARN, FAIL or BLOCK?
