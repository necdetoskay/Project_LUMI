# DELIVERY_LIFECYCLE.md

Version: 1.0.0
Status: Approved
Classification: Governance

# Delivery Lifecycle

## Purpose

Bu doküman, fikir aşamasından üretim ortamına kadar tüm yazılım teslim
yaşam döngüsünü standartlaştırır.

## Lifecycle

1. Idea
2. Discovery
3. Architecture
4. Planning
5. Task Specification
6. Definition of Ready
7. Implementation
8. Self Review
9. Automated Testing
10. Human Review
11. Acceptance
12. Merge
13. Release
14. Maintenance

## Stage Definitions

### Idea
İş ihtiyacı tanımlanır.

### Discovery
Kapsam, riskler ve gereksinimler analiz edilir.

### Architecture
Mimari kararlar ve teknik yaklaşım belirlenir.

### Planning
Sprint ve görevler oluşturulur.

### Task Specification
Her görev için kapsam, dosyalar, kabul kriterleri ve test planı hazırlanır.

### Definition of Ready
Görevin uygulanmaya hazır olduğu doğrulanır.

### Implementation
Coding Agent veya mühendis görevi uygular.

### Self Review
Uygulayan kişi/agent kendi çıktısını kontrol eder.

### Automated Testing
Birim, entegrasyon ve diğer otomatik testler çalıştırılır.

### Human Review
Kod standartları, mimari ve güvenlik açısından incelenir.

### Acceptance
Kabul kriterleri doğrulanır.

### Merge
Onaylanan değişiklik ana dala alınır.

### Release
Sürüm yayınlanır ve notları hazırlanır.

### Maintenance
Hata düzeltmeleri, izleme ve iyileştirmeler yapılır.

## Quality Gates

- Definition of Ready geçmeden geliştirme başlamaz.
- Testler başarısızsa Merge yapılamaz.
- Human Review tamamlanmadan Release yapılamaz.

## Guiding Rule

Her aşama tamamlanmadan sonraki aşamaya geçilmez.

END OF DOCUMENT
