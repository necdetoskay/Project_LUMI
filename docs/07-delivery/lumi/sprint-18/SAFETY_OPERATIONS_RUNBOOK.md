# Sprint 18 — Safety Operations Runbook

## Document Status

- Version: **1.0**
- Status: **Active**
- Last updated: **2026-08-05**
- Scope: **Parent policy operations, audit review, data lifecycle, compliance**

## Purpose

This runbook describes operational procedures for keeping safety controls
correct, auditable and reversible: policy rollback, audit trail review,
consent/export/archive handling, and the data retention rules that constrain
every operation.

## Policy Operations

### Policy model

Each household has one parent policy stored in `profile.parental_settings`
with a `safety_metadata` JSONB surface for `blockedTopics` and `customNotes`.
All changes are recorded in `profile.policy_audit_log` with before/after
state snapshots.

### Updating a policy

Use the parent panel (`/app/settings/safety`) or
`PUT /api/parent-policy` with a member session. The application layer
enforces:

- membership (owner/guardian/member) before reads;
- owner permission before writes (`UNAUTHORIZED_HOUSEHOLD_POLICY_ACCESS` for
  non-owners);
- `contentBoundary` is one of `strict`, `moderate`, `open`;
- `maxDailyStories` is between `0` and `50`.

### Rollback procedure

Policy updates are not transactional rollbacks in the code; rollback is a
manual operation using the audit trail:

1. Read the audit trail:
   `GET /api/parent-policy/audit?householdId=<id>` (member session).
2. Find the target `policy.update` entry and copy its `beforeState`.
3. Issue a new `PUT /api/parent-policy` restoring the `beforeState` fields.
4. Confirm a new `policy.update` audit entry captures the revert.

The audit log is append-only. Never delete or edit existing entries.

### Safety baseline invariant

Do not relax the safety baseline: `contentBoundary` must never widen below
the strictest parent-configured value, `maxDailyStories` must never go above
the parent-configured cap, and blocked topics must remain blocked for
generation and context. When in doubt, keep the safer value.

## Audit Trail Review

### Policy audit trail

- Table: `profile.policy_audit_log`
- Surface: `GET /api/parent-policy/audit?householdId=<id>`
- Fields: `householdId`, `actorId`, `action`, `beforeState`, `afterState`,
  `createdAt`
- Actions: `policy.update`

### Lifecycle audit trail

- Table: `privacy.data_lifecycle_audit_log`
- Surface: `GET /api/privacy/audit?householdId=<id>`
- Fields: `householdId`, `actorId`, `action`, `subjectType`, `subjectId`,
  `beforeState`, `afterState`, `createdAt`
- Actions: `consent.grant`, `consent.revoke`, `export.generated`,
  `archive.child_data`

### Querying directly

For incident review, query PostgreSQL directly:

```powershell
docker compose --file infra/compose/docker-compose.yml exec postgres psql -U lumi -d lumi -c "SELECT household_id, actor_id, action, created_at FROM profile.policy_audit_log ORDER BY created_at DESC LIMIT 50;"
docker compose --file infra/compose/docker-compose.yml exec postgres psql -U lumi -d lumi -c "SELECT household_id, actor_id, action, subject_type, subject_id, created_at FROM privacy.data_lifecycle_audit_log ORDER BY created_at DESC LIMIT 50;"
```

### Review cadence

- After any policy change reported by a family.
- Before and after any purge or legal-hold action.
- On support requests about blocked content or unexpected behavior.

## Data Lifecycle Operations

### Principles (from the retention strategy)

- Soft delete is the default; archive is not delete.
- Append-only history is preserved; never rewrite history.
- Purge is explicit, audited, and irreversible.
- Archive/visibility and retention policies are distinct concepts.
- Media binaries live in object storage; the database holds metadata and
  storage keys only.

### Consent

Consent records (`privacy.consent_records`) are versioned with a unique
`version` per grant. A revoke flips `status` to `revoked` and sets
`revoked_at`; it never deletes the grant row. Consent types are limited to
`content_generation`, `media_generation`, `voice_recording`,
`data_processing`.

### Export

Exports (`privacy.data_export_records`) are metadata-only. They include the
child profile, preferences, character metadata and story session metadata —
never raw story text, prompts, or memory content. Export generation writes a
lifecycle audit entry.

### Archive

`POST /api/privacy/archive` performs an orchestrated soft archive:

1. verifies the child profile belongs to the household;
2. archives each world owned by the child's characters
   (`world.lifecycle_status='archived'`);
3. soft-deletes the child profile (`deleted_at` set);
4. writes an `archive.child_data` lifecycle audit entry.

Archive is reversible at the database layer and does not erase data.

### Purge (planned, not implemented)

A purge job is the planned follow-up slice. When implemented it must:

- be idempotent and run asynchronously;
- check legal-hold eligibility before erasure;
- archive-validate before deleting;
- anonymize personal identifiers where full deletion is not possible
  (story continuity preservation);
- remove external media assets only after reference validation;
- write a purge audit event before irreversible work;
- never run against data under an active legal hold.

## Compliance Notes

- Data minimization applies everywhere: do not display raw story/prompt/
  memory content in parent surfaces.
- Child data export must not include conversation transcripts.
- Support/admin access requires separate authorization and audit; do not add
  impersonation.
- No behavior scoring or hidden surveillance of children.
- The parent panel is responsible and accessible; primary flows must remain
  responsive.

## Operational Limits

- Purge is not yet implemented (soft archive only).
- Automated migration on deploy is not wired.
- Object-storage media cleanup is not automated.
- Compliance framework design docs exist under
  `docs/04-architecture/security/reference-packages/`; they are design
  references, not implemented runtime controls.
