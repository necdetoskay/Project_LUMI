# Testing Strategy

## Test Piramidi
- Unit tests: domain ve pure logic
- Integration tests: repository, outbox, provider adapter
- Contract tests: API ve event schema
- End-to-end: kritik kullanıcı akışları
- Eval tests: AI prompt kalite ve güvenlik

## Kritik Senaryolar
- Hikâye devamlılığı
- 10 günlük dünya simülasyonu sınırı
- NPC emergent interaction
- Provider fallback
- Idempotent background job
