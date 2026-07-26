# Project LUMI Backlog

## Story Outcome & World State Commit System

**Version:** 1.1.0

**Durum:** Backlog (Aktif geliştirme tamamlandıktan sonra değerlendirilecek)

**Last Updated:** 2026-07-26

**Owner:** Project LUMI

### Amaç

Hikâye tamamlandıktan sonra oluşan tüm değişikliklerin güvenli,
doğrulanabilir ve deterministik şekilde yaşayan evrene uygulanmasını
sağlayacak sistemi tasarlamak.

### Kapsam

-   Story Context Snapshot
-   Outcome Manifest
-   Narrative Event Extraction
-   Story Evidence Validation
-   Rule Engine
-   Conflict Resolution
-   Transactional World Commit
-   Event Sourcing
-   Rollback & Compensation
-   Effect Propagation
-   NPC State Updates
-   Memory Updates
-   Relationship Updates
-   Inventory Transactions
-   World Versioning

### Temel Prensip

LLM yalnızca hikâyede ne olduğunu ve olayları üretir. Kurallar bu
olayların dünya üzerindeki etkisini hesaplar. Commit Engine doğrulanmış
değişiklikleri tek transaction ile evrene yazar.

Hikâye metni veritabanını doğrudan güncelleyemez. Story Engine kullanıcıya
gösterilecek hikâyeyi ve kanıt içeren yapılandırılmış outcome manifest'i üretir;
ayrı Commit System doğrulama, kural değerlendirme, conflict resolution ve
transactional state değişikliğinden sorumludur.

### Zorunlu Doğrulama

Sistem backlog'dan çıkarılıp entegre edildiğinde gerçek hikâye senaryolarıyla
doğrulanmalıdır. Testler:

- hikâye öncesi ve sonrası world-state snapshot'larını;
- NPC state, memory ve relationship alanlarını ayrı ayrı;
- inventory sahipliği ve işlem geçmişini;
- quest ve world event değişikliklerini;
- doğrudan ve dolaylı effect propagation'ı;
- duplicate apply ve idempotency davranışını;
- rollback ve conflict resolution sonucunu;
- hikâye metni, outcome manifest, event kayıtları ve PostgreSQL state uyumunu

karşılaştırmalıdır.

Ayrıntılı ve bağlayıcı etkinleştirme test kapsamı:
[Story Outcome and World State Validation Test Plan](story-outcome-world-state-validation-test-plan.md).

### Not

Bu çalışma mevcut geliştirme kapsamına eklenmeyecek, diğer backlog
maddeleriyle birlikte proje sonunda değerlendirilerek uygun görülen
kısımlar sisteme entegre edilecektir.
