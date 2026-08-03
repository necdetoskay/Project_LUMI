# Runbook: High Error Rate

## Symptoms

- Error rate alert firing (>5% over 5 minutes).
- Application monitoring shows elevated 5xx responses.
- Users reporting failures.

## Possible Causes

1. Database connection instability.
2. Downstream service degradation.
3. Application bug or race condition.
4. Sudden traffic spike overwhelming resources.
5. Configuration or feature flag issue.

## Diagnosis

1. Check error rate dashboard and identify affected endpoints.

2. Examine recent application logs for error events:
   ```
   # Filter error-level logs with correlation IDs
   ```

3. Check readiness and dependency health:
   ```
   curl http://localhost:3000/api/readiness
   ```

4. Check for recent deployments or configuration changes.

5. Verify database query performance (slow queries can cause timeouts).

## Resolution

### Database issues
- See [Database Failure Runbook](./db-failure.md).

### Application bug
- Identify the correlation ID from error logs.
- Trace the request through the correlation chain.
- Roll back the offending deployment if recently shipped.

### Traffic spike
- Scale horizontally (add more application instances).
- Review rate limiting configuration.
- Check if a specific endpoint is targeted.

### Configuration issue
- Roll back feature flags or configuration changes.
- Verify environment variable values.

## Verification

- Monitor error rate returning below threshold.
- Confirm affected endpoints respond correctly.
- Run smoke tests.
