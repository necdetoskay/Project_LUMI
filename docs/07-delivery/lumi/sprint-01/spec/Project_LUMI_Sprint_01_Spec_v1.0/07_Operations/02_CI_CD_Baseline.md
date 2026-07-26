# CI/CD Baseline

## Pull request workflow

The CI workflow shall:

1. Check out code.
2. Set up pinned Node.js and pnpm.
3. Restore dependency cache.
4. Install with frozen lockfile.
5. Start PostgreSQL service.
6. Validate environment for test.
7. Apply migrations.
8. Run formatting check.
9. Run lint.
10. Run type-check.
11. Run unit tests.
12. Run integration tests.
13. Run production build.
14. Upload test output only when useful and free of secrets.

## Branch protection recommendation

Require:

- CI success;
- at least one review;
- resolved review conversations;
- no direct push to main.

## Deployment

Automated production deployment is outside Sprint 01. The production build artifact must nevertheless be reproducible.

## Dependency checks

Use an approved dependency audit command. Findings are evaluated rather than blindly auto-fixed when changes could be breaking.
