# TESTING_STANDARD.md

Version: 1.0.0
Status: Approved
Classification: Standard

# Testing Standard

## Purpose

Bu standart, geliştirilen her değişikliğin doğrulanması için uygulanacak
minimum test gereksinimlerini tanımlar.

## Test Pyramid

1. Unit Test
2. Integration Test
3. End-to-End Test
4. Manual Validation

## Mandatory Rules

- Yeni özellikler uygun seviyede test edilmelidir.
- Hata düzeltmeleri mümkün olduğunda regresyon testi ile desteklenmelidir.
- Başarısız testlerle teslim yapılamaz.

## Test Categories

### Unit Tests
İş kurallarını ve fonksiyonları doğrular.

### Integration Tests
Bileşenler ve servisler arasındaki etkileşimi doğrular.

### End-to-End Tests
Temel kullanıcı senaryolarını doğrular.

### Manual Tests
Kullanıcı deneyimi ve görsel kontroller için uygulanır.

## AI Coding Agent Responsibilities

- Gerekli testleri oluşturur veya günceller.
- Test kapsamını raporlar.
- Başarısız testleri teslim etmez.

## Acceptance Checklist

- [ ] Testler çalıştırıldı
- [ ] Başarısız test yok
- [ ] Kritik senaryolar doğrulandı
- [ ] Yeni hatalar oluşmadı
- [ ] Sonuçlar raporlandı

END OF DOCUMENT
