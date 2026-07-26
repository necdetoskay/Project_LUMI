# Project LUMI — Soft Delete, Archive and Data Retention Strategy v1

## Purpose
Defines canonical rules for:
- soft delete
- archive lifecycle
- hard delete eligibility
- retention periods
- anonymization
- purge workflows
- legal/operational hold
- media cleanup

## Core Principles

1. Authoritative business records are never silently hard-deleted.
2. Soft delete is the default for mutable business entities.
3. Historical records remain queryable for audit when required.
4. Archive is different from delete.
5. Purge is explicit, logged and irreversible.

## Entity Policies

### Soft Delete
Recommended for:
- characters
- inventories
- item definitions
- locations
- settlements
- templates
- prompt profiles

Fields:
- archived_at
- archived_by
- archive_reason
- status

### Append-only (Never Soft Delete)
- domain_events
- item_transfers
- state_transitions
- audit logs
- message delivery history

### Hard Delete
Allowed only for:
- temporary cache
- failed transient generation artifacts
- expired staging data
- orphaned temporary uploads

## Archive Lifecycle

States:
active
→ deprecated
→ archived
→ purge_candidate
→ purged

## Child Data

Personal data should support:
- anonymization
- export
- controlled deletion
- media cleanup

Narrative integrity should be preserved by replacing personal identifiers with anonymous references where appropriate.

## Media Cleanup

Object storage cleanup occurs only after:
- database reference removal
- retention validation
- archive policy check

## Retention Categories

Operational:
30–180 days

Generation logs:
configurable

Domain history:
long-term

Story history:
persistent

Audit:
according to operational policy

## Purge Workflow

1. eligibility check
2. legal hold check
3. archive validation
4. anonymize if required
5. remove external assets
6. purge database rows
7. audit purge event

## Critical Constraints

1. Soft delete is default.
2. Archive ≠ delete.
3. Append-only history is preserved.
4. Purge is audited.
5. Media is removed only after reference validation.
6. Personal data supports anonymization.
7. Story continuity is preserved after anonymization.
8. Legal hold overrides purge.
9. Purge jobs are idempotent.
10. Cleanup runs asynchronously.

## Decisions Finalized

- Soft delete is the default lifecycle.
- Historical records are preserved.
- Archive and purge are separate phases.
- Child privacy is supported through anonymization.
- Purge is explicit and logged.

## Next Artifact

Backup, Restore and Disaster Recovery Strategy v1
