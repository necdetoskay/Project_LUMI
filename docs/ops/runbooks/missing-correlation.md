# Runbook: Missing / Invalid Correlation ID

## Symptoms

- Alert firing for high rate of missing or invalid correlation IDs.
- Logs show `correlationId: undefined` or invalid format.
- Request tracing broken across services.

## Possible Causes

1. Client or load balancer not sending `x-correlation-id` header.
2. Client sending malformed correlation ID (invalid UUID format).
3. Middleware not processing the request (path not matched by matcher).
4. Client sending excessively long correlation ID.

## Diagnosis

1. Check the rate of correlation ID anomalies from the observability dashboard.

2. Inspect application logs for correlation-related events.

3. Verify middleware configuration:
   ```
   # Check middleware.ts matcher pattern
   ```

4. Test the endpoint directly with and without correlation header:
   ```
   curl -v http://localhost:3000/api/health
   curl -v -H "x-correlation-id: 550e8400-e29b-41d4-a716-446655440000" http://localhost:3000/api/health
   ```

## Resolution

### Missing header
- Middleware automatically generates a new correlation ID; no action needed.
- If the alert continues, verify the middleware `matcher` includes all required paths.

### Invalid format
- Middleware validates UUID v4 format.
- Client should send RFC 4122 UUID v4 format.
- Invalid IDs are replaced with server-generated ones (no data loss).

### Long IDs
- Maximum accepted length: 128 characters.
- IDs exceeding this are treated as invalid and replaced.

## Verification

- Send request with valid and invalid correlation IDs.
- Confirm response always includes `x-correlation-id` header.
- Confirm logs always have `correlationId` populated.
- Check that alert ceases firing after resolution.
