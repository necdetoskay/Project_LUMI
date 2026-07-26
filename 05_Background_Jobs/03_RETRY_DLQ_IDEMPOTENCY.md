# Retry, DLQ ve Idempotency

- Geçici sağlayıcı hatası: exponential backoff
- Maksimum deneme sayısı
- Başarısız iş: dead-letter queue
- Her iş için idempotency key
- Worker crash sonrası güvenli yeniden işleme

Aynı medya job’ı iki kez işlense bile tek asset oluşmalıdır.
