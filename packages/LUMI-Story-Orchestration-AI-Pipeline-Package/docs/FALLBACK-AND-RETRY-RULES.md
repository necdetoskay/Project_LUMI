# Fallback and Retry Rules

- Retry yalnızca retryable provider hatalarında yapılır.
- Validation hatası aynı modelde körlemesine tekrar edilmez.
- Non-retryable hata sonraki modele geçişi engellemez; mevcut aday bırakılır.
- Aynı generation request için attempt numarası artan olmalıdır.
- Maksimum toplam attempt operasyonel ayardan gelmelidir.
- Rate limit durumunda backoff uygulanmalıdır.
- Dead-letter durumu manuel inceleme gerektirir.
- Provider response ham hâli audit log'a yazılmaz.
