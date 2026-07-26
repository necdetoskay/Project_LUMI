# LUMI — API Contract Foundation + Authentication/Authorization Integration

Bu paket, Project LUMI'nin ilk uygulama API katmanını standardize eder.

## Kapsam

- API response envelope
- Error contract
- Request validation
- Authentication context
- Role-based authorization
- Household ownership kontrolü
- Child profile access kontrolü
- World access kontrolü
- Idempotency header desteği
- Correlation/request ID
- İlk onboarding endpoint zinciri
- OpenAPI başlangıç dokümanı
- Route test şablonları

## İlk endpointler

```text
POST /api/v1/auth/session
GET  /api/v1/me
POST /api/v1/households
POST /api/v1/households/:householdId/children
POST /api/v1/households/:householdId/worlds
POST /api/v1/worlds/:worldId/characters
GET  /api/v1/worlds/:worldId/foundation
```

## Ön koşullar

- Data Layer Stabilization Package
- PostgreSQL + Drizzle
- Next.js App Router
- Auth.js / NextAuth uyumlu session adapter

## Sonraki aşama

Parent Onboarding UI + First Application Vertical Slice
