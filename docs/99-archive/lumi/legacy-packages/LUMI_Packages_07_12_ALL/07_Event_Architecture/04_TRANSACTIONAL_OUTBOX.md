# Transactional Outbox Pattern

## Amaç
Veritabanı güncellemesi ile event yayınının ayrışmasını önlemek.

```mermaid
sequenceDiagram
  participant U as Use Case
  participant DB as PostgreSQL
  participant W as Outbox Worker
  participant C as Consumer

  U->>DB: Aggregate değişikliği + outbox insert
  DB-->>U: Commit
  W->>DB: Pending event'leri oku
  W->>C: Event yayınla
  C-->>W: Ack
  W->>DB: Published işaretle
```

## Outbox Tablosu
- id
- event_type
- event_version
- aggregate_id
- payload_json
- occurred_at
- published_at
- retry_count
- last_error

## Operasyon
- Polling aralığı konfigüre edilir.
- Batch işleme yapılır.
- Retry exponential backoff kullanır.
- Maksimum retry sonrası dead-letter durumuna geçilir.
