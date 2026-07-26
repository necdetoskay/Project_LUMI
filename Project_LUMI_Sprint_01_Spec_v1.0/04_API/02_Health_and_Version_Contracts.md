# Health and Version Endpoint Contracts

## GET `/api/health/live`

### Response 200

```json
{
  "status": "ok",
  "service": "lumi-web",
  "timestamp": "2026-07-26T00:00:00.000Z",
  "version": "0.1.0"
}
```

This endpoint must not call PostgreSQL.

## GET `/api/health/ready`

### Response 200

```json
{
  "status": "ready",
  "timestamp": "2026-07-26T00:00:00.000Z",
  "checks": {
    "database": {
      "status": "ready",
      "durationMs": 8
    }
  },
  "correlationId": "uuid"
}
```

### Response 503

```json
{
  "status": "not_ready",
  "timestamp": "2026-07-26T00:00:00.000Z",
  "checks": {
    "database": {
      "status": "unavailable"
    }
  },
  "correlationId": "uuid"
}
```

The database probe must have a bounded timeout.

## GET `/api/version`

### Response 200

```json
{
  "name": "Project LUMI",
  "service": "lumi-web",
  "version": "0.1.0",
  "environment": "development",
  "commit": "optional-short-sha",
  "builtAt": "optional-iso-timestamp"
}
```

Do not expose package dependency lists, paths, hostnames or secrets.
