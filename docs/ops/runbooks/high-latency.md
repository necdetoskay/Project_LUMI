# Runbook: High Latency

## Symptoms

- P95 latency alert firing (>2000ms over 5 minutes).
- Users report slow page loads or API response times.
- Timeout errors increase.

## Possible Causes

1. Database query performance degradation.
2. Missing database indexes.
3. N+1 query pattern in recently added code.
4. Resource exhaustion (CPU, memory, connection pool).
5. Downstream API or service slow to respond.

## Diagnosis

1. Identify slow endpoints from the latency dashboard.

2. Check database query performance:
   ```
   -- Find slow queries
   SELECT query, mean_exec_time, calls
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

3. Check application resource usage (CPU, memory, active connections).

4. Review recent code changes for potential performance issues.

## Resolution

### Slow database queries
- Add missing indexes (review `EXPLAIN ANALYZE` output).
- Optimize query patterns (reduce JOINs, limit result sets).
- Add pagination or cursor-based iteration.

### N+1 queries
- Identify and fix in application code (use eager loading or batching).

### Resource exhaustion
- Scale vertically (more CPU/memory) or horizontally (more instances).
- Increase connection pool size if database connections are the bottleneck.

### Downstream slow
- Add timeouts to downstream calls.
- Implement caching for repeated requests.
- Consider circuit breaker pattern.

## Verification

- Confirm P95 latency returns below threshold.
- Test the affected endpoint directly with timing measurements.
- Monitor resource usage is within normal range.
