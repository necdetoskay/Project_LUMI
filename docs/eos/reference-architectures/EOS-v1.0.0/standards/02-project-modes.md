# 02 — Project Modes

**Document ID:** EOS-STD-002  
**Version:** 1.0.0  
**Status:** Approved

## Purpose

Define permitted and forbidden behavior in each lifecycle mode.

## Modes

### Discovery
Allowed: research, stakeholder interviews, problem definition, feasibility.  
Forbidden: production coding and premature architecture freeze.  
Exit: problem, scope, stakeholders, constraints, and risks are understood.

### Design
Allowed: PRD, architecture, domain model, UX direction, ADRs.  
Forbidden: feature implementation.  
Exit: approved product and technical design.

### Planning
Allowed: roadmap, backlog, sprint design, dependencies, estimates.  
Forbidden: uncontrolled implementation.  
Exit: executable plan and first sprint.

### Execution
Allowed: coding, testing, review, approved documentation updates.  
Forbidden: architecture redesign, technology switching, scope expansion.  
Exit: committed implementation complete.

### Stabilization
Allowed: defect fixing, regression, performance and security verification.  
Forbidden: new features.  
Exit: release candidate passes Release Ready Gate.

### Release
Allowed: deployment, verification, communication, rollback execution if needed.  
Forbidden: unreviewed code changes.  
Exit: production verification complete.

### Maintenance
Allowed: monitoring, incidents, patches, technical debt planning.  
Forbidden: unplanned large redesign.  
Exit: next approved lifecycle cycle begins.

## Required Practices

- Declare one active mode.
- Apply the rules of that mode.
- Record mode changes.

## Exit Criteria

Mode changes require verified exit criteria and approval.
