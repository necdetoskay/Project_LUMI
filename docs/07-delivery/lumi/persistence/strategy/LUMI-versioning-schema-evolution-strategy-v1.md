# Project LUMI — Versioning and Schema Evolution Strategy v1

- **Document Type:** Architecture / Data Design
- **Status:** Draft v1
- **Date:** 2026-07-25
- **Depends On:** Logical Data Model v1, Domain Event & Outbox Model v1, PostgreSQL Index Strategy v1
- **Primary Database:** PostgreSQL

---

## 1. Purpose

This document defines the canonical versioning and schema evolution strategy for Project LUMI.

It covers:

- database schema versioning;
- migration versioning;
- row versioning;
- optimistic concurrency;
- story and content versioning;
- JSONB schema versioning;
- event and message schema versioning;
- backward compatibility;
- expand-and-contract migrations;
- zero-downtime deployment;
- deprecation;
- rollback;
- data backfill;
- version observability.

The goal is to evolve the system safely without corrupting persistent stories, worlds, memories or user-owned data.

---

## 2. Core Versioning Principle

Project LUMI uses different version concepts for different responsibilities.

These versions must not be collapsed into one field.

Canonical version categories:

1. Database Schema Version
2. Migration Version
3. Row Concurrency Version
4. Content Version
5. Story Version
6. JSONB Schema Version
7. Domain Event Version
8. Integration Message Version
9. Embedding Profile Version
10. Application Release Version

---

## 3. Database Schema Version

The database schema version represents the deployed structural state of PostgreSQL.

It includes:

- tables;
- columns;
- constraints;
- indexes;
- extensions;
- views;
- functions;
- triggers;
- partitions.

Schema version is advanced only through approved migrations.

---

## 4. Migration Versioning

Each migration has a globally unique ordered identifier.

Recommended naming:

```text
YYYYMMDDHHMMSS_short_description
```

Example:

```text
20260725143000_add_story_session_version
```

Alternative sequential naming is allowed if tooling requires it:

```text
000143_add_story_session_version
```

### Rule

Once a migration has been applied to a shared environment, its contents are immutable.

Corrections require a new migration.

---

## 5. Migration Metadata Table

The selected ORM or migration tool may maintain its own metadata.

LUMI may also use:

### Table: `schema_migrations_audit`

Recommended fields:

```text
id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
migration_version TEXT NOT NULL UNIQUE
migration_name TEXT NOT NULL
checksum TEXT NOT NULL
applied_at TIMESTAMPTZ NOT NULL
application_version TEXT NULL
environment TEXT NOT NULL
execution_duration_ms INTEGER NULL
applied_by TEXT NULL
status TEXT NOT NULL
metadata_jsonb JSONB NULL
```

This is optional if the migration tool already provides sufficient auditing.

---

## 6. Immutable Migration Rule

Applied migrations must never be edited.

Reasons:

- checksum mismatch;
- environment drift;
- non-reproducible deployments;
- unclear rollback history;
- broken disaster recovery.

If a migration is wrong:

```text
create a corrective migration
```

Do not rewrite history.

---

## 7. Row Concurrency Version

Mutable aggregate roots use:

```text
version INTEGER NOT NULL DEFAULT 1
```

Used for optimistic concurrency.

Example:

```sql
UPDATE story_sessions
SET
    current_scene_id = :next_scene,
    version = version + 1
WHERE id = :id
  AND version = :expected_version;
```

If zero rows are updated, a concurrency conflict occurred.

---

## 8. Row Version Scope

Use row versioning primarily on:

- story sessions;
- world clocks;
- inventories;
- item instances;
- character relationships;
- emotional states;
- active goals;
- mutable world events;
- generation requests where concurrent updates are possible.

Do not add a version column to every append-only history row.

---

## 9. Content Versioning

Publishable or reusable content must use explicit versions.

Examples:

- story templates;
- event templates;
- item definitions;
- generation profiles;
- prompt templates;
- parental policy definitions;
- embedding profiles.

Content versions separate definition evolution from runtime state.

---

## 10. Story Version Immutability

A published story version is immutable.

### Table: `story_versions`

Recommended fields:

```text
id UUID PK
story_id UUID NOT NULL
version_number INTEGER NOT NULL
status TEXT NOT NULL
schema_version INTEGER NOT NULL
content_hash TEXT NOT NULL
published_at TIMESTAMPTZ NULL
supersedes_story_version_id UUID NULL
created_at TIMESTAMPTZ NOT NULL
UNIQUE (story_id, version_number)
```

### Rule

Existing story sessions continue using the story version they started with.

Publishing a new version does not mutate active or completed sessions.

---

## 11. Story Version Statuses

Canonical values:

```text
draft
validating
published
deprecated
archived
rejected
```

Only published versions are available for new normal sessions.

Deprecated versions may continue serving existing sessions.

---

## 12. Session-to-Version Binding

`story_sessions.story_version_id` is immutable after session start.

This ensures:

- stable scene graph;
- stable choice IDs;
- reproducible history;
- consistent continuation;
- safe analytics.

A session upgrade requires an explicit migration workflow, not a direct FK change.

---

## 13. Content Hash

Versioned content should include a deterministic hash.

Examples:

```text
content_hash
definition_hash
payload_hash
```

Purpose:

- detect accidental mutation;
- support idempotency;
- compare versions;
- validate exports;
- avoid duplicate embedding generation.

---

## 14. JSONB Schema Versioning

Flexible JSONB payloads require explicit schema versions.

Preferred pattern:

```json
{
  "schema_version": 2,
  "data": {
    "fear": 0.4,
    "joy": 0.7
  }
}
```

Alternative:

Store a dedicated relational column:

```text
state_schema_version INTEGER NOT NULL
state_jsonb JSONB NOT NULL
```

Dedicated columns are preferred for high-value JSONB documents.

---

## 15. JSONB Version Upgrade

When reading old JSONB:

1. inspect schema version;
2. transform to current in application memory;
3. process using current model;
4. optionally persist upgraded representation;
5. preserve migration audit if materially changed.

Avoid requiring every JSONB row to be rewritten immediately during deployment.

---

## 16. Lazy vs Eager JSONB Migration

### Lazy Migration

Upgrade when read.

Advantages:

- lower deployment risk;
- no large immediate backfill;
- gradual conversion.

Costs:

- more application complexity;
- mixed versions remain longer.

### Eager Migration

Backfill all rows.

Advantages:

- consistent database shape;
- simpler long-term reads.

Costs:

- deployment and locking risk;
- operational load.

Default:

```text
expand support
-> lazy compatibility
-> controlled backfill
-> contract old version
```

---

## 17. Domain Event Versioning

Every domain event has:

```text
event_name
event_version
```

Breaking payload changes require a new version.

Consumers must explicitly declare supported versions.

Unsupported versions must not be silently accepted.

---

## 18. Integration Message Versioning

Every integration message has:

```text
message_type
message_version
```

Command and worker contracts evolve independently from domain event contracts.

A domain event v2 may still produce integration message v1 if the worker contract remains unchanged.

---

## 19. Backward Compatibility Window

During rolling deployment, old and new application versions may run concurrently.

Therefore migrations must support a compatibility window.

Typical sequence:

```text
old app + expanded schema
new app + expanded schema
backfill
new app only
contract old schema
```

The schema must not break the old app before all old instances are removed.

---

## 20. Expand-and-Contract Pattern

Canonical migration pattern:

### Expand

- add nullable column;
- add new table;
- add new index;
- add compatible enum/status value;
- begin dual-read or dual-write support.

### Migrate

- backfill data;
- validate;
- switch read path;
- monitor.

### Contract

- stop old writes;
- remove old reads;
- add stricter constraint;
- drop old column or table.

Destructive change must never be the first step.

---

## 21. Adding a Required Column

Unsafe:

```sql
ALTER TABLE large_table
ADD COLUMN new_field TEXT NOT NULL;
```

Safer sequence:

1. add nullable column;
2. deploy code writing both paths;
3. backfill in batches;
4. validate no nulls;
5. add default if needed;
6. add `NOT NULL`;
7. remove old path later.

---

## 22. Renaming a Column

Direct rename may break old application instances.

Safer sequence:

1. add new column;
2. dual-write old and new columns;
3. backfill;
4. switch reads;
5. stop old writes;
6. remove old column in later release.

Views may be used temporarily where appropriate.

---

## 23. Changing a Column Type

For risky or non-binary-compatible type changes:

1. add new typed column;
2. dual-write;
3. backfill in batches;
4. validate conversion;
5. switch reads;
6. enforce constraints;
7. remove old column later.

Avoid long table rewrites during a user-facing deployment.

---

## 24. Enum Evolution

PostgreSQL enums can be difficult to contract.

Default recommendation:

Use lookup tables or constrained text for highly evolving domain statuses.

Native PostgreSQL enum may be used only for very stable values.

Removing an enum value requires a careful migration plan.

---

## 25. Constraint Evolution

Add expensive constraints safely.

Preferred sequence:

```sql
ALTER TABLE ...
ADD CONSTRAINT ...
CHECK (...) NOT VALID;
```

Then:

```sql
ALTER TABLE ...
VALIDATE CONSTRAINT ...;
```

This reduces blocking risk on large tables.

---

## 26. Foreign Key Evolution

For large tables:

1. add FK as `NOT VALID`;
2. validate existing data;
3. enforce for new data;
4. monitor invalid rows before finalization.

The precise PostgreSQL syntax depends on migration implementation.

---

## 27. Index Evolution

New production indexes should use:

```sql
CREATE INDEX CONCURRENTLY
```

when blocking is unacceptable.

Index removal should use:

```sql
DROP INDEX CONCURRENTLY
```

where appropriate.

Concurrent operations must be handled outside normal migration transactions.

---

## 28. Data Backfill Model

Large backfills must be:

- batched;
- resumable;
- idempotent;
- observable;
- rate-limited;
- safe under concurrent writes.

Recommended control table:

### Table: `data_backfill_jobs`

```text
id UUID PK
job_type TEXT NOT NULL
migration_version TEXT NOT NULL
status TEXT NOT NULL
cursor_jsonb JSONB NULL
processed_count BIGINT NOT NULL DEFAULT 0
failed_count BIGINT NOT NULL DEFAULT 0
started_at TIMESTAMPTZ NULL
completed_at TIMESTAMPTZ NULL
last_error_jsonb JSONB NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

---

## 29. Dual Write Rules

Dual writing is temporary.

It must define:

- source of truth during transition;
- mismatch detection;
- end date or removal milestone;
- reconciliation strategy.

Permanent uncontrolled dual writes are prohibited.

---

## 30. Read Compatibility

During migration, application reads may use:

```text
new field if present
else old field
```

This fallback must be removed after migration completion.

Compatibility code must not remain indefinitely.

---

## 31. Versioned API and DTO Mapping

Database schema version and API version are independent.

Application mapping isolates persistence changes from client contracts.

Do not expose database column names as permanent public API contracts without an explicit decision.

---

## 32. Prompt and Generation Profile Versioning

AI-related configuration must be versioned.

Examples:

- prompt template;
- safety policy;
- generation profile;
- context builder policy;
- model routing policy.

Generated outputs should reference the exact versions used.

Recommended fields:

```text
prompt_template_version_id
generation_profile_id
context_policy_version
model_name
model_version
```

---

## 33. Embedding Profile Versioning

Embedding profiles are immutable after activation.

A model or dimension change creates a new profile.

Existing embeddings remain linked to their original profile.

Cutover occurs through default-profile selection, not in-place mutation.

---

## 34. Versioned Rule Definitions

Simulation, event and decision rules may evolve.

Versionable examples:

- relevance scoring;
- memory decay;
- emotion half-life;
- utility weights;
- event eligibility;
- offline simulation intensity.

Runtime records should reference the rule version used when reproducibility matters.

---

## 35. Migration Rollback Strategy

Not every migration is safely reversible.

Each migration must be classified:

```text
reversible
forward-fix only
data-destructive
```

### Reversible

Can safely restore prior schema and data interpretation.

### Forward-Fix Only

Rollback would be riskier than applying a corrective migration.

### Data-Destructive

Requires backup, explicit approval and restore plan.

---

## 36. Application Rollback Compatibility

A deployment rollback is safe only if the previous application version can operate on the current expanded schema.

This is another reason to use expand-and-contract.

Never assume database rollback accompanies application rollback.

---

## 37. Destructive Migration Rule

Destructive changes require:

- confirmed backup;
- restore test;
- impact analysis;
- deprecation window;
- application usage verification;
- explicit approval;
- rollback or forward-fix plan.

Examples:

- dropping a table;
- dropping a column;
- irreversible data transformation;
- changing ownership semantics;
- deleting historical records.

---

## 38. Deprecation Lifecycle

Canonical states:

```text
active
deprecated
read_only
archived
removed
```

Deprecation should define:

- replacement;
- first deprecated version;
- last supported version;
- planned removal;
- migration instructions.

---

## 39. Version Observability

Required visibility:

```text
current database schema version
application release version
pending migrations
failed migrations
active story versions
deprecated content versions
JSONB schema version distribution
event version distribution
embedding profile usage
backfill progress
```

Operational dashboards should expose version skew.

---

## 40. Environment Promotion

Migration flow:

```text
local
-> development
-> test
-> staging
-> production
```

Production migration must use the exact reviewed migration artifact tested earlier.

Do not generate production-only migration SQL manually unless emergency procedures require it.

---

## 41. Migration Testing

Required tests:

- clean database migration;
- upgrade from current production-like version;
- migration with representative data volume;
- old app against expanded schema;
- new app against expanded schema;
- rollback or forward-fix behavior;
- constraint validation;
- idempotent backfill resume.

---

## 42. Seed Data Versioning

Reference and seed data must be versioned separately from user data.

Examples:

- status definitions;
- capability definitions;
- event templates;
- default roles;
- system item definitions.

Seed changes should be idempotent and migration-safe.

---

## 43. Import and Export Compatibility

Exports should include:

```text
export_schema_version
application_version
content versions
source IDs
checksums
created_at
```

Importers must:

- validate version;
- transform supported older versions;
- reject unsupported newer versions clearly;
- preserve UUIDs when safe.

---

## 44. Historical Data Integrity

New versions must not reinterpret historical facts silently.

Examples:

- old choice meaning;
- prior event payload;
- completed story version;
- item provenance;
- world event occurrence.

Historical records remain tied to the version active when they were created.

---

## 45. Version Skew Rules

Temporary skew is allowed between:

- application and schema;
- producer and consumer;
- old and new embedding profiles;
- JSONB schema versions.

Skew must be:

- intentional;
- observable;
- bounded;
- backward-compatible;
- scheduled for convergence.

---

## 46. Prohibited Practices

Prohibited:

- editing applied migrations;
- destructive change as first deployment step;
- changing published story versions in place;
- silently changing event payload meaning;
- storing mixed JSONB schemas without version markers;
- permanent dual writes;
- assuming application rollback means database rollback;
- deleting old embeddings before new profile validation;
- reusing a version number for different content;
- depending on migration execution order outside recorded versions.

---

## 47. MVP Scope

Required:

- immutable ordered migrations;
- row version on mutable aggregates;
- immutable published story versions;
- event/message schema versions;
- JSONB schema version markers;
- expand-and-contract migration approach;
- batched backfill support;
- migration test process;
- schema/application version observability.

Recommended later:

- automated compatibility tests;
- schema contract registry;
- self-service backfill dashboard;
- import version transformer library;
- canary consumer version testing.

---

## 48. Critical Constraints

1. Different version concerns use separate fields.
2. Applied migrations are immutable.
3. Published story versions are immutable.
4. Active sessions remain bound to their starting story version.
5. Mutable aggregates use optimistic concurrency versions.
6. JSONB structures carry schema versions.
7. Breaking event/message changes create new versions.
8. Rolling deployments require backward compatibility.
9. Destructive changes use expand-and-contract.
10. Large backfills are batched and resumable.
11. Dual writes are temporary and observable.
12. Application rollback must remain compatible with expanded schema.
13. Embedding model changes create new profiles.
14. Historical records retain original interpretation.
15. Version skew is temporary, bounded and monitored.
16. Unsupported versions fail explicitly.
17. Seed data changes are idempotent.
18. Production schema changes are promoted from tested artifacts.

---

## 49. Example Story Evolution

### Version 1

```text
Story:
The Old Bridge

Choice:
Cross the bridge
Follow the river
```

A child starts a session using version 1.

### Version 2

The author adds:

```text
Ask the fox for help
```

Result:

- version 1 remains unchanged;
- active version 1 session continues safely;
- new sessions use version 2 after publication;
- analytics can distinguish both versions;
- embeddings reference their respective source versions.

---

## 50. Example Column Migration

Goal:

Rename:

```text
story_sessions.state_jsonb
```

to:

```text
story_sessions.session_state_jsonb
```

Safe path:

1. add `session_state_jsonb`;
2. deploy dual-write;
3. backfill old rows;
4. switch reads to new column;
5. verify;
6. stop writing old column;
7. drop old column in a later release.

---

## 51. Decisions Finalized

1. LUMI uses explicit version types for schema, rows, content and messages.
2. Migration history is immutable.
3. Story publication creates immutable versions.
4. Sessions never silently move to a new story version.
5. JSONB documents are versioned.
6. Event and integration message contracts evolve independently.
7. Expand-and-contract is the default zero-downtime strategy.
8. Backfills are operational jobs, not unbounded deployment scripts.
9. Dual writes are temporary.
10. Destructive migrations require explicit governance.
11. Embedding and AI configuration changes create new versioned profiles.
12. Historical data preserves original semantics.
13. Version skew is supported only within a controlled compatibility window.
14. Production migrations are tested and promoted artifacts.
15. Forward-fix is preferred when rollback would create greater risk.

---

## 52. Next Artifact

**Soft Delete, Archive and Data Retention Strategy v1**

The next document will define:

- soft delete rules;
- archive states;
- hard delete eligibility;
- historical preservation;
- child account deletion;
- media cleanup;
- retention windows;
- anonymization;
- legal and operational holds;
- purge workflows.
