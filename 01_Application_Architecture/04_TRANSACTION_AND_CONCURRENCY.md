# Transaction ve Concurrency Yönetimi

## 1. Transaction Sınırı
Transaction, tek bir application use case boyunca sürer.

## 2. Temel Kurallar
- Repository’ler kendi başına transaction başlatmaz.
- Aynı use case içindeki DB değişiklikleri tek transaction içinde tamamlanır.
- Harici servis çağrıları DB transaction’ı içinde uzun süre bekletilmez.

## 3. Outbox Pattern
DB kaydı ile event yayınlama tutarlılığı için transactional outbox kullanılır.

Akış:
1. Domain değişikliği kaydedilir.
2. Outbox mesajı aynı transaction içinde yazılır.
3. Worker mesajı queue veya event bus’a iletir.
4. Başarılı gönderim işaretlenir.

## 4. Concurrency
- Aggregate üzerinde optimistic locking kullanılır.
- Story session ve world state kayıtlarında version alanı bulunur.
- Aynı seçim isteğinin iki kez işlenmesini önlemek için idempotency key kullanılır.
