# Error, Logging and Observability Specification

## Error envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [],
    "correlationId": "uuid"
  }
}
```

`details` is optional and must be safe for the client.

## Error categories

- `VALIDATION_ERROR` — 400
- `UNAUTHENTICATED` — 401
- `FORBIDDEN` — 403
- `NOT_FOUND` — 404
- `CONFLICT` — 409
- `DEPENDENCY_UNAVAILABLE` — 503
- `INTERNAL_ERROR` — 500

## Structured log fields

- timestamp
- level
- message
- service
- environment
- correlationId
- route
- method
- statusCode
- durationMs
- errorCode
- userId when authorized and safe
- metadata

## Request context

Accept an incoming `x-correlation-id` only when it passes length and character validation; otherwise generate a UUID. Return the resolved ID in the response header.

## Health metrics

Sprint 01 does not require a metrics server. The readiness response may include dependency duration but must not become a detailed monitoring endpoint.

## Redaction

Logger configuration must redact keys matching token, password, secret, authorization, cookie and database URL patterns.
