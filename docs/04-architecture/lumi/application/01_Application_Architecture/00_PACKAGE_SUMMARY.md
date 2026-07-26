# Paket 01 — Application Architecture

## Amaç
LUMI’nin backend uygulama katmanını; domain kurallarını, use-case akışlarını, transaction sınırlarını ve modüller arası iletişimi sürdürülebilir biçimde tanımlamak.

## Kapsam
- Katmanlı ve modüler monolith yaklaşımı
- Application Service ve Use Case yapısı
- Domain Service kullanımı
- Command/Query ayrımı
- Transaction yönetimi
- Domain Event ve Integration Event yaklaşımı
- Hata yönetimi ve idempotency

## Temel Kararlar
1. İlk sürümde **modüler monolith** kullanılacaktır.
2. Her modül kendi domain, application ve infrastructure sınırına sahip olacaktır.
3. CQRS tam kapsamlı değil, yalnızca command/query sorumluluk ayrımı seviyesinde uygulanacaktır.
4. Transaction sınırı application use-case seviyesinde kurulacaktır.
5. Modüller doğrudan tablo erişimiyle değil, açık servis sözleşmeleri veya event’lerle iletişim kuracaktır.

## Çıktılar
Bu paket, AI Orchestration ve API katmanlarının üzerine kurulacağı temel backend mimarisini belirler.
