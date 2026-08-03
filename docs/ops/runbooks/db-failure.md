# Runbook: Database Connection / Readiness Failure

## Symptoms

- Readiness probe returns 503.
- Application endpoints return 500 errors.
- Logs show database connection failures.

## Possible Causes

1. PostgreSQL service is down or restarting.
2. Network partition between application and database.
3. Connection pool exhausted.
4. Database credentials rotated without updating the application.
5. Database disk full or in recovery mode.

## Diagnosis

1. Check readiness endpoint:
   ```
   curl -v http://localhost:3000/api/readiness
   ```

2. Check PostgreSQL connectivity:
   ```
   psql "$DATABASE_URL" -c "SELECT 1"
   ```

3. Check PostgreSQL logs:
   ```
   docker logs lumi-postgres
   ```

4. Check connection pool metrics (if available) for exhaustion.

## Resolution

### Database down
- Restart PostgreSQL: `pnpm infra:restart` or Docker Compose restart.
- Verify data directory integrity.

### Network issue
- Verify both services are on the same Docker network.
- Check firewall rules.

### Pool exhaustion
- Increase pool size in database configuration.
- Check for long-running queries or unclosed connections.

### Credential rotation
- Update `DATABASE_URL` environment variable.
- Restart the application.

## Verification

- Confirm `/api/readiness` returns 200.
- Confirm application endpoints return expected responses.
- Check application logs for `readiness.degraded` events.
