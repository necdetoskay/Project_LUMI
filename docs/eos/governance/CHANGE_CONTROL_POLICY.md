# CHANGE_CONTROL_POLICY.md

Version: 1.0.0
Status: Approved
Classification: Governance

# Change Control Policy

## Purpose

Bu politika, projede yapılacak tüm değişikliklerin kontrollü, izlenebilir ve
geri alınabilir şekilde yönetilmesini sağlar.

## Objectives

- Mimari bütünlüğü korumak
- Kapsam kaymasını önlemek
- Riskleri azaltmak
- Değişikliklerin izlenebilir olmasını sağlamak

## Change Categories

### Standard Change
Düşük riskli, önceden tanımlanmış değişiklikler.

### Normal Change
Kod, iş mantığı veya veri modelini etkileyen planlı değişiklikler.

### Emergency Change
Üretim ortamını etkileyen kritik hata veya güvenlik düzeltmeleri.

## Required Workflow

1. Değişiklik talebi oluşturulur.
2. Etki analizi hazırlanır.
3. Task Specification güncellenir.
4. İnsan onayı alınır.
5. Uygulama yapılır.
6. Testler çalıştırılır.
7. Kod incelemesi tamamlanır.
8. Yayın onayı verilir.

## Impact Analysis

Her değişiklik aşağıdaki başlıklarda değerlendirilmelidir:

- Mimari
- Güvenlik
- Performans
- Veritabanı
- API
- Dokümantasyon
- Geri alma (Rollback)

## Rollback Requirement

Her riskli değişiklik için uygulanabilir bir geri dönüş planı hazırlanmalıdır.

## AI Coding Agent Rules

AI Coding Agent:

- Onaysız kapsam değişikliği yapamaz.
- Mimari karar alamaz.
- Değişiklik gerekçesini raporlar.
- Belirsizlik durumunda uygulamayı durdurur ve insan onayı bekler.

## Approval Matrix

| Değişiklik | İnsan Onayı |
|------------|-------------|
| Mimari | Zorunlu |
| Veritabanı Şeması | Zorunlu |
| API Sözleşmesi | Zorunlu |
| Güvenlik | Zorunlu |
| Dokümantasyon | Önerilir |
| Küçük Refactoring | Proje kuralına göre |

## Guiding Principle

Kontrolsüz hız yerine kontrollü teslim tercih edilir.

END OF DOCUMENT
