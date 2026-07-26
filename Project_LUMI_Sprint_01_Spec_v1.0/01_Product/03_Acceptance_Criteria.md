# Detailed Acceptance Criteria

## AC-01 Repository bootstrap

Given a clean clone and installed prerequisites, when the documented setup commands are executed, then dependencies install and the application starts without source changes.

## AC-02 Environment validation

Given a required variable is absent or malformed, when the application starts, then it fails with a readable variable-specific message and does not print secret values.

## AC-03 Database startup

Given Docker is available, when `docker compose up -d db` runs, then PostgreSQL becomes healthy and accepts connections through the documented port.

## AC-04 Migration baseline

Given an empty database, when the migration command runs, then all Sprint 01 tables, indexes and constraints are created.

## AC-05 Seed idempotency

Given seed has already run, when it runs again, then it completes without duplicate logical records.

## AC-06 Liveness

When `GET /api/health/live` is called, then HTTP 200 is returned with status `ok`, timestamp and application version.

## AC-07 Readiness success

Given PostgreSQL is reachable, when `GET /api/health/ready` is called, then HTTP 200 is returned and database status is `ready`.

## AC-08 Readiness failure

Given PostgreSQL is unreachable, when readiness is called, then HTTP 503 is returned within the configured timeout and database status is `unavailable`.

## AC-09 Version endpoint

When `GET /api/version` is called, then it returns semantic application version, environment and optional commit identifier without secret configuration.

## AC-10 API error envelope

Given invalid input reaches an endpoint, then the response conforms to the common error contract and includes a correlation ID.

## AC-11 Protected route

Given no valid development session exists, when the protected application route is opened, then access is denied or redirected according to the chosen authentication baseline.

## AC-12 Audit write

Given a supported foundational action occurs, when the audit service is invoked, then one immutable audit record is persisted.

## AC-13 Quality scripts

When each documented quality command runs, then it exits zero on the reference implementation.

## AC-14 Production build

When the build command runs with valid build-time configuration, then a production build completes successfully.

## AC-15 CI

Given a pull request, when CI executes, then install, lint, type-check, tests and build run using the same package scripts used locally.

## AC-16 Documentation completeness

A new developer can set up the project using only repository documentation and sample environment files.
