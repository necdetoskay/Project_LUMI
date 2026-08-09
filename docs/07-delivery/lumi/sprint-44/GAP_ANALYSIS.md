# Sprint 44 — Memory Production Gap Analysis

Date: 2026-08-09
Status: DISCOVERY COMPLETE

## Executive summary

LUMI already has useful memory-adjacent production evidence, but it does not yet have a canonical production memory model.

The closest existing substrate is `npc_intelligence.beliefs`, backed by `DrizzleBeliefSourceRepository`, plus the web composition-root `NpcBeliefStoryContinuityContextAdapter`. This path has already proven two important properties through PX-LUMI-03: persisted direct observation/hearsay can survive reload, and absent facts are not fabricated by the continuity adapter.

S44 must preserve that evidence while introducing a separate canonical memory contract instead of overloading NPC belief semantics with every kind of long-lived memory.

## Existing production seams

### 1. NPC belief persistence

Current belief records provide:

- `npcId`
- `householdId`
- optional `worldId`
- `factId`
- `claim`
- `confidence`
- `source`
- `provenance[]`
- creation/verification/expiry timestamps
- active/stale/expired lifecycle

This is appropriate for NPC knowledge/belief state, but it is narrower than canonical memory.

### 2. Continuity projection

`NpcBeliefStoryContinuityContextAdapter` currently combines:

- persisted character identity/traits/relationships/inventory
- latest committed choice/world continuity facts
- active NPC beliefs

The adapter correctly scopes belief reads by NPC + household + world.

### 3. Existing regression evidence

`PX-LUMI-03-MEMORY-COHERENCE-001` proves that:

- direct observation remains source-distinct after persistence/reload
- hearsay provenance remains distinguishable
- an absent memory is not fabricated by retrieval
- persisted evidence can reach a later story-generation prompt

These contracts are mandatory S44 regressions.

## Production gaps

### GAP-01 — No canonical memory aggregate

There is no record capable of representing story-relevant memory independently from NPC belief.

Canonical memory needs explicit ownership/scope and must support character, NPC and possibly profile/world contextual memory without forcing all semantics into `Belief`.

### GAP-02 — No commit-linked memory provenance

Existing beliefs do not encode the full source chain required by S44:

- story/session linkage
- outcome/effect linkage
- source event identifier
- commit/idempotency key

Therefore the system cannot yet prove that a memory exists *because a specific outcome commit succeeded*.

### GAP-03 — No deterministic memory-write idempotency contract

Belief insertion currently relies on record identity/conflict behavior. S44 requires an explicit deterministic effect key so replay/retry of the same committed evidence cannot create another canonical memory effect.

### GAP-04 — No rollback/no-residue memory boundary

There is no canonical memory write phase tied to successful world-state commit completion. S44 must ensure rejected, failed or rolled-back outcomes never leave a memory row behind.

### GAP-05 — Retrieval is not bounded at the memory layer

The current continuity adapter loads every active belief for each requested NPC and appends each one to prompt context.

There is no explicit:

- per-owner/global result limit
- relevance threshold
- salience weighting
- deterministic tie-break order
- context budget

This can produce unbounded prompt growth over long horizons.

### GAP-06 — No production salience model

`confidence` answers “how strongly is this believed?”, not “how important is this memory for future continuity?”.

S44 needs separate salience/importance semantics.

### GAP-07 — Lifecycle is insufficient for memory history

Belief lifecycle supports active/stale/expired. Canonical memory requires explicit durable/decaying/superseded/archived behavior while preserving historical provenance.

### GAP-08 — No supersession/conflict relation

There is no canonical link from a newer memory to the memory/evidence it supersedes. A stale fact can be marked stale, but deterministic conflict resolution and audit history are not represented as a first-class contract.

### GAP-09 — Prompt projection exposes internal identifiers/terminology

Current NPC continuity summaries include raw NPC identifiers and source strings. These are acceptable as internal continuity facts but S44 needs an explicit prompt-safe projection that prevents raw IDs, numeric scores, provenance internals and lifecycle vocabulary from leaking into child-facing prose.

### GAP-10 — Owner scope is narrower than S44 requires

Belief repository scoping is NPC + household + optional world. Canonical memory must explicitly represent and enforce the relevant owner/scope dimensions, including household/profile/character/session context as applicable.

## Architectural decision for S44

Do **not** rename or stretch `Belief` into the universal memory model.

Keep belief persistence as the NPC epistemic model and introduce a canonical memory aggregate/repository whose source evidence may reference committed story/world effects or NPC belief evidence.

This keeps these concepts separate:

- **Belief** — what an NPC currently believes/knows and with what confidence.
- **Memory** — durable/selective evidence of what an owner experienced, learned, felt, promised, discovered or changed, with source provenance and retrieval salience.

The continuity adapter may combine both through a bounded projection layer.

## Canonical model required next

Minimum S44 canonical memory fields:

- `id`
- `householdId`
- `worldId`
- `childProfileId?`
- `ownerType`
- `ownerId`
- `kind`
- `summary`
- `salience`
- `confidence`
- `sourceType`
- `sourceId`
- `storySessionId?`
- `outcomeId?`
- `effectKey`
- `provenance`
- `lifecycle`
- `supersedesMemoryId?`
- `createdAt`
- `lastReinforcedAt?`
- `expiresAt?`
- `archivedAt?`

`effectKey` must be unique inside the authoritative scope and derived from committed evidence, not from a random retry-local identifier.

## Retrieval contract required next

Canonical retrieval must:

1. require exact household scope
2. require exact world scope
3. enforce owner/profile/character scope where supplied
4. exclude archived/superseded/expired memories by default
5. rank deterministically using relevance + salience + recency/reinforcement
6. apply an explicit hard result limit
7. use a deterministic tie-breaker
8. return a prompt-safe projection rather than raw persistence rows

## Write-path contract required next

Memory production must run from **committed** evidence only.

Required sequence:

1. validate outcome/effects
2. commit authoritative world-state transaction
3. derive canonical memory candidates from committed effects
4. persist each candidate with deterministic `effectKey`
5. on replay, conflict on `effectKey` becomes a no-op
6. on rejected/rolled-back authoritative commit, step 3 must never run

If the existing world-state transaction/outbox architecture offers a transaction-safe post-commit effect mechanism, S44 should reuse it rather than creating a second reliability path.

## Test matrix to implement

- `MEM-WRITE-COMMIT-001`
- `MEM-ROLLBACK-NO-RESIDUE-001`
- `MEM-IDEMPOTENCY-001`
- `MEM-TENANT-ISOLATION-001`
- `MEM-OWNER-SCOPE-001`
- `MEM-RETRIEVAL-RELEVANCE-001`
- `MEM-RETRIEVAL-BOUND-001`
- `MEM-SUPERSESSION-001`
- `MEM-PROVENANCE-001`
- `MEM-CONTEXT-NO-TECH-LEAK-001`
- `L9-MEMORY-JOURNEY`
- existing `PX-LUMI-03-MEMORY-COHERENCE-001` regression

## Implementation order

1. canonical memory domain contract
2. DB schema/migration and repository
3. deterministic write/idempotency service
4. committed-outcome adapter/wiring
5. bounded retrieval + ranking service
6. lifecycle/supersession behavior
7. prompt-safe continuity projection
8. unit/integration tests
9. DB-backed S44 ULTEF and L9 journey
10. CI/Security/Integration/PX closeout
