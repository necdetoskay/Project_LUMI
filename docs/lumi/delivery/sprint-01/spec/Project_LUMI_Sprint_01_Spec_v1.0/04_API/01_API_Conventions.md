# API Conventions

## Base conventions

- JSON responses.
- UTF-8.
- Route handlers under `/api`.
- ISO 8601 UTC timestamps.
- Opaque string identifiers.
- Zod validation at boundaries.
- Common error envelope.
- Correlation ID header: `x-correlation-id`.

## Success envelope

Simple technical endpoints may return direct typed objects. Domain endpoints introduced later should use a consistent data envelope:

```json
{
  "data": {},
  "meta": {
    "correlationId": "uuid"
  }
}
```

## HTTP semantics

- 200 successful read.
- 201 successful create.
- 204 successful no-content operation.
- 400 validation error.
- 401 no valid identity.
- 403 valid identity without permission.
- 404 resource absent.
- 409 invariant or uniqueness conflict.
- 500 unexpected error.
- 503 required dependency unavailable.

## Pagination

No paginated public domain endpoint is required in Sprint 01. Future endpoints should use cursor pagination.

## Versioning

Sprint 01 does not add URL API versioning. Breaking external API exposure is not expected. Contracts remain documented and tested.
