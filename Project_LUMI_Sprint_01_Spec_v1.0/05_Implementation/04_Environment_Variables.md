# Environment Variable Specification

## Required

- `NODE_ENV`
- `DATABASE_URL`
- `APP_VERSION`
- `APP_ENV`

## Optional build metadata

- `APP_COMMIT_SHA`
- `APP_BUILT_AT`

## Authentication baseline

- `AUTH_SECRET`
- `ENABLE_DEV_AUTH`
- `DEV_AUTH_EMAIL`

## Operational

- `LOG_LEVEL`
- `DATABASE_HEALTH_TIMEOUT_MS`

## Example

```dotenv
NODE_ENV=development
APP_ENV=local
APP_VERSION=0.1.0
DATABASE_URL=postgresql://lumi:lumi_dev_password@localhost:5432/lumi
AUTH_SECRET=replace-with-long-local-secret
ENABLE_DEV_AUTH=true
DEV_AUTH_EMAIL=developer@lumi.local
LOG_LEVEL=debug
DATABASE_HEALTH_TIMEOUT_MS=1500
```

## Validation rules

- `APP_ENV` is one of `local`, `test`, `staging`, `production`.
- `ENABLE_DEV_AUTH=true` is rejected when `APP_ENV=production`.
- Timeout is an integer within a safe range.
- `AUTH_SECRET` has a minimum length.
- Public client bundles receive only explicitly exposed values.
