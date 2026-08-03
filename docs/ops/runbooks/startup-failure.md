# Runbook: Startup Failure

## Symptoms

- Application fails to start or crashes immediately after startup.
- Health/liveness probe returns non-200 status.
- Container/process exits with non-zero code immediately.

## Possible Causes

1. Missing or invalid environment variables.
2. Database unreachable at startup.
3. Invalid configuration values.
4. Port already in use.
5. Migration script failure.

## Diagnosis

1. Check application logs for startup errors:
   ```
   pnpm --filter @lumi/web logs       # or docker logs <container>
   ```

2. Verify required environment variables:
   ```
   echo $DATABASE_URL
   echo $REDIS_URL
   ```

3. Check port availability:
   ```
   netstat -tlnp | grep 3000
   ```

## Resolution

### Missing environment variables
- Ensure `.env` or `.env.local` has all required values.
- Verify `serverEnvironment` schema in `apps/web/lib/env.ts` for required keys.

### Database unreachable
- Verify PostgreSQL is running: `pnpm infra:status`
- Check credentials and connection string format.

### Port conflict
- Stop the conflicting process or change `PORT` environment variable.

## Verification

- Restart the application.
- Confirm `/api/health` returns `{"status":"ok"}`.
- Confirm `/api/readiness` returns 200.
