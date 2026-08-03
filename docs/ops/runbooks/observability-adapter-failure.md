# Runbook: Observability Adapter Failure

## Symptoms

- Metrics or error reporting adapter throws errors.
- Alerts indicate gaps in metric data.
- No impact on application business logic (by design).

## Possible Causes

1. Vendor metrics service is down or unreachable.
2. Network partition between application and metrics backend.
3. Invalid or expired API credentials for metrics provider.
4. Adapter configuration error.

## Diagnosis

1. Check `safeError` logs for adapter errors (logged at warn level).

2. Verify metrics backend connectivity:
   ```
   curl -v https://metrics-backend.example.com/health
   ```

3. Check adapter configuration and credentials.

4. Verify no disruption to business transactions (by design, adapter failure should not affect application).

## Resolution

### Vendor down
- Wait for vendor recovery (no application impact expected).
- If high-priority, switch to a different adapter or use the no-op adapter.

### Configuration error
- Fix credentials or endpoint URL in environment configuration.
- Restart the application if configuration is loaded at startup.

### Network issue
- Verify firewall rules and network connectivity.
- Check DNS resolution for metrics backend.

### Fallback to no-op
- If the adapter continues to fail, set the metrics adapter to no-op:
  ```
  # Set METRICS_ADAPTER=noop in environment
  ```
- This ensures zero overhead and zero application impact.

## Verification

- Confirm application business flows are unaffected.
- Monitor `safeAdapter` error suppression logs.
- When fixed, verify metrics data resumes flowing.
- Run health and smoke tests.
