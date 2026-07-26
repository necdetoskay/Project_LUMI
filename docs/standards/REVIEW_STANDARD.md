# REVIEW_STANDARD.md

Version: 1.0.0
Status: Approved
Classification: Standard

# Review Standard

## Purpose

Bu standart, geliştirilen her değişikliğin teknik ve kalite açısından
incelenmesi için uygulanacak Code Review sürecini tanımlar.

## Review Principles

- Her değişiklik en az bir gözden geçirme sürecinden geçmelidir.
- Review yalnızca çalışan kodu değil; mimari, güvenlik, performans ve
  sürdürülebilirliği de değerlendirmelidir.

## Review Checklist

### Functional Review
- Gereksinimler karşılanıyor mu?
- Acceptance Criteria tamamlandı mı?

### Code Quality
- Kod okunabilir mi?
- İsimlendirme standartlara uygun mu?
- Gereksiz tekrar var mı?

### Architecture
- Mevcut mimari korunuyor mu?
- Gereksiz bağımlılık eklenmiş mi?

### Security
- Yetkilendirme doğru uygulanmış mı?
- Girdi doğrulaması mevcut mu?
- Gizli bilgiler korunuyor mu?

### Performance
- Gereksiz sorgular var mı?
- Büyük veri işlemleri optimize edilmiş mi?

### Documentation
- Gerekli dokümantasyon güncellendi mi?

## AI Coding Agent Responsibilities

- Kendi çıktısını ön incelemeden geçirir.
- Tespit ettiği riskleri raporlar.
- Review gerektiren kararları açıkça belirtir.

## Review Outcomes

- Approved
- Approved with Minor Changes
- Changes Requested
- Rejected

## Exit Criteria

- [ ] Kritik hata yok
- [ ] Kod standartlara uygun
- [ ] Testler başarılı
- [ ] Dokümantasyon güncel
- [ ] Review onayı alındı

END OF DOCUMENT
