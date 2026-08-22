# Data Integrity Foundation

Status: Phase 0 / PR-1

## Goal

Make schema changes deterministic, auditable, immutable after application, and fail-closed when database history cannot be proven.

## Repository-wide migration policy

CI recursively discovers every `migrations` directory under `apps/` and `packages/`.

Every SQL migration must:

- use `NNNN_snake_case.sql` naming;
- have a sequence ID unique inside its migration scope;
- never reuse or expand an existing historical duplicate sequence;
- remain immutable once applied.

The only frozen historical duplicate sequence exceptions are in `packages/profiles/migrations`:

- `0061_ai_generation_trace_cost.sql`
- `0061_onboarding_llm_task.sql`
- `0062_ai_generation_traces.sql`
- `0062_prompt_management_audit.sql`

These are legacy production history. They are accepted exactly as a frozen set; adding a third `0061` or `0062` migration fails CI.

## Profile migration ledger

The hardened profile runner maintains `public.lumi_schema_migrations` with:

- scope
- migration filename
- sequence ID
- SHA-256 checksum
- applied timestamp

Before applying pending migrations, it verifies every recorded migration still exists in the repository and still has the same sequence and checksum.

The runner serializes migration execution with a PostgreSQL advisory lock and applies each SQL migration plus its ledger record inside one transaction.

## Fail-closed baseline rule

An existing database that already contains the `profile` schema but has no migration ledger is **not** automatically baselined.

The runner stops with an error instead of guessing which migrations have been applied. Existing production databases require an explicit, audited one-time baseline procedure before this runner is allowed to own their migration history.

This is intentional. A false baseline is more dangerous than a blocked deployment because it can permanently hide schema drift.

## Invariants enforced by CI/self-tests

- deterministic checksum generation;
- checksum changes when SQL changes;
- malformed migration filename rejection;
- new duplicate sequence rejection;
- frozen legacy duplicate sets accepted only exactly;
- applied migration missing from repository rejected;
- sequence drift rejected;
- checksum drift rejected.

## Next hardening steps

1. Define and execute the audited production baseline procedure for the profile ledger.
2. Move the remaining domain migration runners to the same ledger/lock/checksum contract.
3. Remove production build scripts that cherry-pick individual migrations after authoritative runners exist.
4. Add clean-database and production-like upgrade-path integration gates.
5. Continue with household/scope constraints, then child-avatar/NPC identity separation.
