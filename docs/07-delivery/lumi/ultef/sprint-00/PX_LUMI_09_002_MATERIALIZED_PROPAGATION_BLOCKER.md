# PX-LUMI-09-002 — Materialized Outcome Propagation Blocker

Status: BLOCKED BY PRODUCT GAP
Date: 2026-08-08

## Goal

Prove that an indirect outcome emitted by the story world-commit pipeline is not only persisted in the story outbox but is actually materialized in the target domain and survives reload.

Canonical example:

```text
story outcome
→ world commit
→ npc_rumor_spread outbox intent
→ outbox propagator
→ NPC hearsay/belief persistence
→ reload NPC knowledge
→ same fact/claim/confidence/provenance still present
```

## What exists

`IndirectEffectPropagator` is production code. It claims pending outbox rows, calls an applicator, marks rows applied/failed, records events and enforces attempt limits/idempotent processing semantics.

## Product gap

`RumorSpreadApplicator` is currently an explicit placeholder. For `npc_rumor_spread` it validates the payload and returns `{ writes: 1 }`, but it does not call the NPC intelligence belief/hearsay persistence path and therefore does not materialize the rumor in canonical NPC state.

Consequently ULTEF must not report the following as proven:

```text
Mira heard rumor X
NPC belief state contains X
reload preserves X
```

Merely observing an outbox row move to `applied` is insufficient, because the present applicator can report a write count without performing a domain write.

## Required production work to unblock

1. Introduce a package-safe port/adapter from story indirect-effect propagation to the NPC intelligence belief/hearsay application service.
2. Map the `npc_rumor_spread` payload into the canonical NPC belief/hearsay command.
3. Persist fact/claim/source/confidence/provenance/hops with household/world isolation.
4. Make the application idempotent by the outbox/idempotency key or equivalent stable domain key.
5. Return the actual materialized write count.
6. On failure, allow the existing propagator retry/failed semantics to remain authoritative.
7. Add a real DB-backed ULTEF scenario that reloads the NPC state after propagation.

## Required ULTEF evidence after unblock

The future `PX-LUMI-09-002` execution narrative must include runtime values such as:

```text
SETUP
- Household: <runtime>
- World: <runtime>
- Source NPC: Mira (<runtime id>)
- Target NPC: Bora (<runtime id>)
- Rumor fact: <runtime fact id>
- Claim: <runtime claim>

WHAT HAPPENED
01. Story outcome produced an npc_rumor_spread indirect intent.
02. Outbox row persisted as pending.
03. IndirectEffectPropagator claimed the row.
04. NPC belief/hearsay applicator wrote the rumor for Bora.
05. Outbox row changed pending → applied.
06. Bora's NPC state was reloaded from persistence.
07. The same fact/claim/source/confidence/provenance was found.
08. Propagator was run again and no duplicate belief was created.

STATE DELTAS
- story.outbox.status: pending → applied
- npc[Bora].beliefs[rumor].present: false → true
- npc[Bora].beliefs[rumor].confidence: null → <runtime value>

ASSERTIONS
- intent materialized in NPC state
- household/world ownership preserved
- provenance preserved
- confidence preserved within contract
- reload preserved materialized state
- retry did not duplicate belief
```

## ULTEF rule

`PX-LUMI-09-002` remains `BLOCKED` until a concrete NPC materialization path exists and a DB-backed test proves reload durability. A placeholder applicator returning success is never sufficient for PASS.
