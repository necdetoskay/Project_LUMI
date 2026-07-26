# 08 — Testing Standard

**Document ID:** EOS-STD-008  
**Version:** 1.0.0  
**Status:** Approved

## Purpose

Verify software behavior systematically and reduce regression risk.

## Test Levels

- Unit
- Integration
- End-to-End
- Manual Verification
- Smoke
- Regression

## Principles

- Testing is part of implementation.
- Test depth follows risk.
- Tests are repeatable and independent.
- Critical requirements are traceable to evidence.

## Required Practices

- Define acceptance criteria before implementation.
- Test changed behavior and relevant regressions.
- Automate stable and repeatable checks.
- Record defects with reproducible steps.
- Protect critical business and security paths.

## Anti-Patterns

- Testing only the happy path
- Tests dependent on execution order
- Ignoring flaky tests
- Manual verification presented as permanent automation
- Releasing with unknown critical coverage gaps

## Deliverables

- Test cases or automated tests
- Test report
- Defect records
- Regression evidence

## Exit Criteria

Testing is complete when required scenarios pass and unresolved risk is explicitly accepted.
