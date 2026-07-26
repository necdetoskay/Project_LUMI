
# Project LUMI — Database Configuration v1

- Status: Accepted
- Phase: Persistence Implementation

## Purpose
Standardize all database runtime configuration across development, test and production.

## Configuration Sources
Priority:
1. Environment variables
2. Secret manager (production)
3. Local `.env`
4. Safe defaults (development only)

## Required Environment Variables

```text
DATABASE_URL
DATABASE_HOST
DATABASE_PORT
DATABASE_NAME
DATABASE_USER
DATABASE_PASSWORD

DB_POOL_MIN
DB_POOL_MAX

DB_IDLE_TIMEOUT_MS
DB_CONNECTION_TIMEOUT_MS
DB_STATEMENT_TIMEOUT_MS

DB_SSL_MODE
DB_APPLICATION_NAME

MIGRATION_DATABASE_URL
TEST_DATABASE_URL
```

## Environments

### Development
- Local PostgreSQL
- Verbose logging
- Auto health checks
- SSL optional

### Test
- Dedicated database
- Isolated schema
- Automatic cleanup
- Migration before tests

### Production
- Secret-based credentials
- SSL required
- Connection pooling
- Minimal logging
- No destructive startup actions

## Connection Pool Rules

- Reuse one shared pool
- No per-request pool creation
- Transactions use one checked-out connection
- Close pool gracefully on shutdown

Suggested defaults:

```text
Pool Min: 2
Pool Max: 20
```

Tune after observing workload.

## Timeout Policy

```text
Connection timeout
Idle timeout
Statement timeout
```

Long-running queries should be investigated instead of increasing limits blindly.

## SSL Policy

Development:
- Optional

Production:
- Required
- Certificate validation enabled

## Health Check

Verify:

- database reachable
- simple SELECT succeeds
- migrations up to date
- pool available

Expose readiness and liveness separately.

## Startup Validation

Application startup must fail if:

- configuration missing
- invalid values
- database unreachable (when required)
- migration version incompatible

## Roles

### Migration Role
Can:
- create schema
- alter tables
- create indexes
- install extensions

### Runtime Role
Can:
- read/write application data
- execute approved functions

Cannot:
- alter schema
- create extensions
- drop tables

## Secrets

Never commit credentials.

Production secrets come from a secure secret provider.

## Logging

Log:

- connection failures
- timeout events
- retry attempts
- slow queries
- migration execution

Never log passwords or connection strings.

## Graceful Shutdown

1. Stop accepting work
2. Finish active transactions
3. Stop workers
4. Close pool
5. Exit

## Acceptance Checklist

- Environment validated
- Pool configured
- SSL configured
- Health checks implemented
- Startup validation complete
- Runtime and migration roles separated
- Graceful shutdown tested

## Decisions Finalized

1. Environment-driven configuration.
2. Separate development, test and production settings.
3. Dedicated migration role.
4. Shared connection pool.
5. Mandatory startup validation.
6. Health checks required.
7. SSL mandatory in production.
8. Graceful shutdown required.

## Next Artifact

**PostgreSQL Extensions v1**

Will define:
- pgcrypto
- pgvector
- pg_trgm
- extension installation order
- migration strategy
- compatibility rules.
