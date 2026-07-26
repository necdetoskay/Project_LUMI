# DELIVERY_STANDARD.md

Version: 1.0.0
Status: Approved
Classification: Standard

# Delivery Standard

## Purpose

Bu standart, her Sprint, özellik ve sürüm tesliminin aynı kalite seviyesinde,
eksiksiz ve doğrulanabilir şekilde gerçekleştirilmesini tanımlar.

## Delivery Principles

- Teslim edilebilir her çıktı doğrulanmış olmalıdır.
- Eksik testlerle teslim yapılmaz.
- Dokümantasyon teslimin ayrılmaz parçasıdır.
- Teslim edilen her sürüm izlenebilir olmalıdır.

## Required Delivery Artifacts

- Kaynak kod
- Güncellenmiş dokümantasyon
- Test sonuçları
- Release Notes
- Changelog
- Migration dosyaları (varsa)
- Konfigürasyon değişiklikleri (varsa)

## Release Readiness Checklist

- [ ] Acceptance Criteria tamamlandı
- [ ] Definition of Done tamamlandı
- [ ] Testler başarılı
- [ ] Code Review onaylandı
- [ ] Güvenlik kontrolleri tamamlandı
- [ ] Performans etkisi değerlendirildi
- [ ] Dokümantasyon güncellendi

## Versioning

Her teslim aşağıdaki bilgileri içermelidir:

- Version
- Release Date
- Build Number (varsa)
- Değişiklik özeti

## Rollback Requirements

Her teslim için geri dönüş planı tanımlanmalıdır.

- Etkilenen bileşenler
- Geri alma adımları
- Veri uyumluluğu
- Risk değerlendirmesi

## AI Coding Agent Responsibilities

- Teslim öncesi kontrol listesini doğrular.
- Eksik artefaktları raporlar.
- Teslim paketinin bütünlüğünü kontrol eder.
- İnsan onayı gerektiren noktaları açıkça belirtir.

## Delivery Completion

Bir teslim yalnızca aşağıdaki koşullar sağlandığında tamamlanmış kabul edilir:

- Tüm kalite kapıları geçildi.
- Gerekli belgeler hazır.
- Onay süreci tamamlandı.
- Sürüm arşivlendi.

END OF DOCUMENT
