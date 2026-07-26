# 12 — Quality Gates

**Document ID:** EOS-STD-012  
**Version:** 1.0.0  
**Status:** Approved

## Purpose

Prevent incomplete or unverified work from moving to the next lifecycle stage.

## Principles

- Gate Before Progress
- Objective Criteria
- Fail Fast
- Evidence Required
- No Silent Bypass

## Gates

### Gate 1 — Discovery Complete
Problem, stakeholders, needs, constraints, and risks are documented.

### Gate 2 — Design Approved
PRD, architecture, key ADRs, data and integration decisions are approved.

### Gate 3 — Planning Ready
Backlog, priorities, dependencies, first sprint, and Definition of Done exist.

### Gate 4 — Implementation Complete
Approved scope is implemented, tested, reviewed, and documented.

### Gate 5 — Release Ready
No unresolved critical defect, security checks complete, release and rollback plans ready.

### Gate 6 — Production Verified
Deployment succeeded, smoke checks passed, monitoring is active, critical alarms are absent.

## Gate Result

Only two normal outcomes exist:

- Passed
- Failed

Exceptions require a documented governance record.

## Required Evidence

Depending on the gate:

- PRD
- Architecture
- ADRs
- Sprint outputs
- Test report
- Review record
- Security review
- Release and rollback plans
- Production verification

## Exit Criteria

A gate passes only when every mandatory criterion is satisfied or formally excepted.
