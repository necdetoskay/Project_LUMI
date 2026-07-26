# Stabilization Checklist

## Schema

- [ ] Tüm domain schema export'ları birleşik
- [ ] Circular import kontrol edildi
- [ ] Tüm self-reference FK'ler SQL migration içinde
- [ ] JSONB alanları yalnızca esnek metadata için kullanılıyor

## Migration

- [ ] 0001–0008 sıralı
- [ ] Migration checksum kayıtları korunuyor
- [ ] Additive migration politikası uygulanıyor
- [ ] Destructive değişiklik yok

## Transaction

- [ ] Onboarding vertical slice tek transaction
- [ ] Audit aynı transaction
- [ ] Outbox aynı transaction
- [ ] Serializable isolation kritik akışlarda kullanılıyor

## Seed

- [ ] Reference seed idempotent
- [ ] Code alanları sabit
- [ ] World-specific policy ayrı seed

## Observability

- [ ] Database health endpoint hazır
- [ ] Required schema checker hazır
- [ ] Migration failure loglanıyor
- [ ] Outbox backlog ölçülebiliyor

## Security

- [ ] Parent-child ownership kontrolleri application layer'da
- [ ] Sensitive payload audit'e kontrolsüz yazılmıyor
- [ ] AI output safety review olmadan publish edilmiyor
- [ ] Child data retention politikası daha sonraki security paketine taşındı
