# LUMI Paket 07 — Event Architecture

## Amaç
LUMI içindeki domain değişikliklerini güvenilir, izlenebilir ve gevşek bağlı bir event mimarisiyle yönetmek.

## Temel Kararlar
- Domain event'ler işlem sınırı içinde üretilir.
- Kalıcı event yayını için Transactional Outbox kullanılır.
- Uygulama içi iletişim başlangıçta in-process event dispatcher ile yürütülür.
- Harici broker ancak ölçek ihtiyacı doğduğunda eklenir.
- Event şemaları geriye uyumlu şekilde versiyonlanır.
- Idempotent consumer zorunludur.
- Uzun süreçler saga/process manager ile yönetilir.
- Event replay varsayılan değil, kontrollü operasyon özelliğidir.

## Dosyalar
1. Domain Event Catalog
2. Event Schema Standard
3. Event Bus & Dispatch
4. Outbox Pattern
5. Saga & Workflow
6. Event Versioning
7. Replay & Recovery
8. Operational Checklist

## Kodlamaya Etkisi
Bu paket tamamlandığında application layer, background jobs ve observability paketleri ortak bir olay dili kullanabilir.
