# AGENTIC_SOFTWARE_DELIVERY_STANDARD.md

Version: 1.0.0
Status: Approved
Classification: Governance

# Agentic Software Delivery Standard (ASDS)

## 1. Purpose

Bu standart, insan mühendisler ile AI Coding Agent'larının birlikte çalışacağı yazılım geliştirme yaşam döngüsünü tanımlar.

## 2. Principles

1. Human owns architecture.
2. AI executes approved specifications.
3. Specification before implementation.
4. Documentation is part of the deliverable.
5. Every change must be reviewable.
6. Every feature must be testable.

## 3. Roles

### Human Engineer
- Mimari kararları alır.
- Sprint kapsamını belirler.
- Kabul kriterlerini onaylar.
- Son kalite kontrolünü yapar.

### Coding Agent
- Yalnızca onaylı görevleri uygular.
- Belirlenen sınırlar içinde kod üretir.
- Test ve dokümantasyonu günceller.
- Mimariyi değiştirmez.

## 4. Delivery Lifecycle

Idea
→ Architecture
→ Planning
→ Task Specification
→ Implementation
→ Testing
→ Review
→ Acceptance
→ Release
→ Maintenance

## 5. Mandatory Rules

- Specification olmadan geliştirme yapılamaz.
- İncelenmeyen kod üretime alınamaz.
- Test edilmeyen özellik tamamlanmış sayılmaz.
- Büyük değişiklikler küçük görevlere bölünmelidir.
- Her görev izlenebilir olmalıdır.

## 6. Quality Gates

### Definition of Ready
- Amaç tanımlandı.
- Kapsam belirlendi.
- Kabul kriterleri yazıldı.
- Risk değerlendirildi.

### Definition of Done
- Kod tamamlandı.
- Testler geçti.
- Dokümantasyon güncellendi.
- Kod incelemesi tamamlandı.
- Kabul onayı verildi.

## 7. Traceability

Her görev aşağıdakiler ile ilişkilendirilmelidir:

- Proje
- Sprint
- Task ID
- Specification
- Commit
- Review
- Test Sonucu

## 8. Change Control

Hiçbir mimari değişiklik insan onayı olmadan uygulanamaz.

## 9. Version Policy

Semantic Versioning (SemVer) kullanılır.

- Major: Mimari veya standart değişikliği
- Minor: Yeni kurallar
- Patch: Düzeltmeler

END OF DOCUMENT
