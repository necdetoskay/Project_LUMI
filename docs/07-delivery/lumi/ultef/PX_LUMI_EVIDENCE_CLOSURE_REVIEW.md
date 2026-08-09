# PX-LUMI Evidence Closure Review

Date: 2026-08-09  
Status: **ACTIVE REVIEW**

This review closes Project LUMI-specific gates only when existing runtime evidence satisfies every catalog assertion. It deliberately avoids creating duplicate tests simply to obtain a gate-specific filename.

## PX-LUMI-01 — Universe Continuity

Decision: **EXECUTED PASS**

Evidence composition:

- `L6-GOLDEN-001` starts a real disposable-PostgreSQL world/session, advances a generated scene, commits a world outcome, reloads persisted indirect state, completes the first session and starts a later session with the same `worldId`.
- The Golden narrative records the world-version before/after delta and proves prior committed continuity remains available after a later session starts.
- `L5-CONTEXT-DIVERGENCE-001` stores different persisted facts for the same NPC in two worlds and proves each later generation prompt receives only the matching world-scoped fact, excluding unrelated-world state.
- `L9-LONG-HORIZON-001` / DB-backed long-horizon execution repeatedly advances the same world across ten sessions without identity loss or uncontrolled cross-state mutation.

Catalog mapping:

- same world identity after reload: satisfied by Golden later-session/world identity and context-divergence world scoping;
- committed world facts persist: satisfied by Golden materialized/reloaded prior outcome state;
- unrelated state is not mutated/leaked: satisfied by world-scoped context divergence plus long-horizon/concurrency isolation evidence;
- later sessions observe prior committed state when relevant: satisfied by Golden later-session continuity and `L6-CONTEXT-TO-STORY-001`.

No new PX-01 test is required.

## PX-LUMI-03 — Memory Coherence

Decision: **PENDING NEW RUNTIME GATE**

Existing evidence already proves hearsay provenance, confidence decay, persistence, reload and later-story use. The audit identified one missing explicit assertion: direct observation and hearsay must remain source-distinct in the same runtime context while an absent memory remains absent.

New scenario under validation:

`PX-LUMI-03-MEMORY-COHERENCE-001`

It uses disposable PostgreSQL plus the production `NpcBeliefStoryContinuityContextAdapter` and deterministic story generation. It must prove:

- direct observation source remains `direct_observation`;
- hearsay source retains provenance as `hearsay:<source>`;
- both persisted facts reach later story context;
- a nonexistent memory is neither retrieved nor fabricated.

PX-LUMI-03 remains pending until that blocking workflow step passes.

## PX-LUMI-05 — Story Consequence

Decision: **BLOCKED — production choice→world handoff**

The repository has strong component/runtime evidence on both sides of the boundary:

- `commitChoice()` validates option availability, persists one committed choice, one consequence and a story event transactionally;
- `L4-CHOICE-DIVERGENCE-001` proves distinct valid options persist into separate branch histories/consequences;
- `L4-CHOICE-WORLD-DIVERGENCE-001` proves different outcome manifests create different durable world commits/hashes/outbox effects;
- PX-LUMI-09/L6/L9 prove durable world commits and later continuity.

However `L4-CHOICE-WORLD-DIVERGENCE-001` constructs the `OutcomeManifest` inside the test. No production consumer was found that turns the persisted committed choice/consequence into the canonical outcome/world-commit input.

The catalog requires one causal chain from selected active-scene option through committed consequence to later observed world/story state. The two independent halves cannot be treated as that chain.

See `PX_LUMI_05_STORY_CONSEQUENCE_BLOCKER.md`.

## PX-LUMI-06 — Child / Household Isolation

Decision: **EXECUTED PASS**

Evidence composition:

- `L2-ISOLATION-001` creates two synthetic households, attempts a foreign child-profile read, receives no protected record, then reloads the protected profile and proves ownership/identity are unchanged.
- `L2-ISOLATION-003` writes a real hearsay belief in Household A and proves the same NPC/fact identity is invisible in Household B after DB reload.
- L9 DB-backed concurrency runs independent household/child/world/session chains concurrently and verifies zero cross-household session, commit and idempotency-ledger leakage.
- Existing story-session IDOR regression verifies mutation routes cannot operate on another household's session.

Catalog mapping:

- ownership gates reject cross-household access: satisfied;
- child-specific state remains isolated: satisfied across profiles, beliefs, sessions, commits and idempotency scope;
- evidence contains only synthetic/random test identities and no real child data: satisfied by fixture design.

No new PX-06 test is required.

## PX-LUMI-09 — Story Outcome & World State Commit

Decision: **EXECUTED PASS**

Evidence composition:

- `PX-LUMI-09-001` validates the outcome manifest, performs the transactional world commit, advances world version, records events/outbox work, reloads durable records and proves retry idempotency.
- `PX-LUMI-09-002` applies an indirect rumor outbox effect into a real persisted NPC belief, preserves source/confidence/provenance, reloads it and proves the second propagation pass processes zero duplicates.
- L9 commit recovery proves invalid/failed commit attempts leave zero partial side effects and a corrected retry commits exactly once.
- L9 crash/restart and backup/restore prove persisted commit/idempotency state survives process and database recovery boundaries.
- Golden/L6 continuity proves committed effects remain observable after later session startup.

Catalog mapping:

- valid manifest: satisfied;
- expected state deltas: satisfied;
- invalid/duplicate outcomes do not corrupt state: satisfied;
- transactional commit: satisfied;
- reload reproduces committed state: satisfied;
- indirect NPC/memory/world effects when applicable: satisfied through materialized rumor propagation.

No new PX-09 test is required.

## Current phase result before PX-LUMI-03 validation

Closed / PASS:

- PX-LUMI-01
- PX-LUMI-06
- PX-LUMI-07
- PX-LUMI-08
- PX-LUMI-09
- PX-LUMI-10

Pending execution:

- PX-LUMI-03

Blocked by missing production boundaries:

- PX-LUMI-02 — persisted character state → later production story context
- PX-LUMI-04 — event → bounded emotion delta → persisted emotion → decision context
- PX-LUMI-05 — persisted choice consequence → canonical outcome/world commit → later context

A blocker is not a test failure. It means ULTEF found a required Project LUMI behavior that cannot currently be proven through the production composition path without substituting a synthetic handoff.
