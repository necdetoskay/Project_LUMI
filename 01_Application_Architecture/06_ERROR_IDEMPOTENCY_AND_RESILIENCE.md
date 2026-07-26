# Hata, Idempotency ve Dayanıklılık

## Hata Sınıfları
- ValidationError
- AuthorizationError
- NotFoundError
- ConflictError
- DomainRuleViolation
- ExternalProviderError
- RateLimitError

## Idempotency
Özellikle şu işlemlerde zorunludur:
- Hikâye segmenti üretme
- Görsel üretme
- TTS üretme
- Ödeme/kredi düşme
- Seçim kaydetme

## Retry
- Sadece geçici hatalarda retry uygulanır.
- Exponential backoff kullanılır.
- Domain validation hataları retry edilmez.

## Circuit Breaker
LLM, görsel ve TTS sağlayıcıları için circuit breaker uygulanır.
