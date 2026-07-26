# Release and Rollback Baseline

## Versioning

The application starts at a pre-release or early semantic version such as `0.1.0`. Version appears in the version endpoint and status page.

## Release evidence

Record:

- commit SHA;
- application version;
- migration identifiers;
- Node and pnpm versions;
- CI run;
- known issues;
- rollback notes.

## Database rollback

Sprint 01 does not assume every migration can be safely reversed. The default recovery approach is:

1. stop the affected deployment;
2. restore a verified database backup when destructive migration damage occurred;
3. redeploy the last known good application;
4. create a forward corrective migration.

For development databases, recreation is acceptable.

## Application rollback

The platform should be able to redeploy a previous build that remains compatible with the current database schema. Migration compatibility must be considered before release.
