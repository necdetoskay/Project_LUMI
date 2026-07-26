# Sprint 01–05 Foundation

## Sprint 01 — Repository Bootstrap
- Monorepo/repo yapısı
- CI
- lint/typecheck/test
- env yönetimi
- health endpoint

## Sprint 02 — Auth & Parent Account
- parent registration/login/logout
- secure session and token lifecycle
- authentication persistence baseline
- authorization foundation

## Sprint 03 — Household & Child Profiles
- household and membership model
- child profile CRUD
- age/interest/parent-policy preferences
- Family Space and ownership rules

## Sprint 04 — PostgreSQL Domain Core
- shared Drizzle schema and migration governance
- repository and transaction abstraction
- domain event, audit and outbox foundation
- PostgreSQL/JSONB/pgvector/index baseline

## Sprint 05 — Observability & Operations Baseline
- structured logs
- metrics
- traces
- error reporting

Sprint 01'de oluşturulan Docker ve toolchain tabanı Sprint 04'te domain
persistence katmanına dönüştürülür. Sprint 02–03 için gereken dar identity ve
profile migration'ları kendi sprintlerinde oluşturulur; Sprint 04 bunları
ortak migration/repository standardında birleştirir.
