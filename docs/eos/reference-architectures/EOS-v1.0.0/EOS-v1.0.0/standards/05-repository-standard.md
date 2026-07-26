# 05 — Repository Standard

**Document ID:** EOS-STD-005  
**Version:** 1.0.0  
**Status:** Approved

## Purpose

Create predictable, secure, and maintainable repositories.

## Recommended Structure

- `docs/`
- `src/`
- `tests/`
- `scripts/`
- `tools/`
- `config/`
- `assets/`
- `.github/`

## Branches

- `main`
- `feature/*`
- `bugfix/*`
- `hotfix/*`
- `release/*`

## Required Practices

- Keep secrets out of source control.
- Use meaningful commits.
- Protect the main branch.
- Review changes before merge.
- Keep generated artifacts out unless intentionally versioned.
- Include README, license, version, and changelog where applicable.

## Anti-Patterns

- Direct uncontrolled changes to main
- Committing credentials
- Large mixed-purpose commits
- Unexplained binary files
- Repository structure that hides ownership

## Exit Criteria

A repository is ready when it can be cloned, understood, validated, and used without undocumented setup knowledge.
