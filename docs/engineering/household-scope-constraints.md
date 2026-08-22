# Household and Child Scope Integrity

PR-2 of the Data Integrity Hardening epic moves household/child ownership from an application convention into a database invariant.

## Invariant

A non-null `child_profile_id` may only be paired with the canonical `household_id` stored on that child profile.

A UUID existing in two independently valid foreign-key columns is not enough to prove that the two rows belong to the same household.

## Database contract

`profile.child_profiles` exposes `(id, household_id)` as a unique composite identity. Migration `0078_household_scope_constraints.sql` discovers every current base table in the `profile` schema that persists both `child_profile_id` and `household_id` and applies a composite foreign key to that identity.

Before constraints are added, every discovered table is checked for historical scope drift. If any row points at a child whose canonical household differs from the row's household, the migration raises an exception. Because the authoritative profile migration runner executes each migration transactionally, no partial hardening is committed.

The composite foreign key intentionally uses PostgreSQL's default delete action. Existing single-column foreign keys keep their established delete semantics such as `CASCADE` or `SET NULL`; the scope constraint only proves ownership consistency.

Rows whose `child_profile_id` is null remain valid. This preserves household-level records that are intentionally not bound to a child.

## Verification

CI starts an isolated PostgreSQL instance and runs `profile:scope-selftest`. The test proves four behaviors:

1. the old independent foreign keys allow a mismatched child/household pair;
2. migration 0078 fails closed when such historical drift exists;
3. after clean application, a matching pair succeeds while a mismatched pair is rejected by PostgreSQL;
4. an existing `ON DELETE SET NULL` child foreign key keeps its behavior after the composite scope constraint is installed.

## Follow-up contract

New profile tables that persist both scope columns must preserve the same invariant. PR-3 may remove some redundant scope columns while splitting child avatars and NPC identities; until then, the database must reject cross-household child references rather than relying on repository filters.
