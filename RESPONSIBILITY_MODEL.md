# RESPONSIBILITY_MODEL.md

Version: 1.0.0
Status: Approved
Classification: Governance

# Responsibility Model

## Purpose

Bu doküman, yazılım geliştirme sürecinde insan ekip üyeleri ile AI Coding Agent'larının
yetki ve sorumluluk sınırlarını tanımlar.

## Responsibility Matrix

| Alan | Human Engineer | Coding Agent | Reviewer |
|------|----------------|--------------|----------|
| Mimari | Sahip | Destek | Doğrular |
| Task Spec | Hazırlar | Uygular | Kontrol eder |
| Kod Yazımı | Gerektiğinde | Birincil | İnceler |
| Test | Onaylar | Yazar/Çalıştırır | Doğrular |
| Dokümantasyon | Onaylar | Günceller | Kontrol eder |
| Yayın | Onay | Hazırlar | Doğrular |

## Human Engineer

Sorumluluklar:

- Mimari kararlarını almak.
- Sprint hedeflerini belirlemek.
- Kabul kriterlerini yazmak.
- Riskleri değerlendirmek.
- Son onayı vermek.

## Coding Agent

Sorumluluklar:

- Onaylı Task Spec'i uygulamak.
- Kod standartlarına uymak.
- Testleri güncellemek.
- Dokümantasyonu güncellemek.
- Belirsizlikleri raporlamak.

Yapamaz:

- Mimariyi değiştirmek.
- Kapsamı genişletmek.
- Onaysız bağımlılık eklemek.
- Güvenlik politikalarını değiştirmek.

## Reviewer

- Kod kalitesini değerlendirir.
- Standart uyumunu kontrol eder.
- Teknik borcu tespit eder.
- Geri bildirim verir.

## Escalation

Aşağıdaki durumlarda konu insan mühendise aktarılır:

- Eksik Specification
- Mimari çelişki
- Güvenlik riski
- Performans riski
- Veri modeli değişikliği

## Decision Rule

İnsan tasarlar.
AI uygular.
Reviewer doğrular.
İnsan kabul eder.

END OF DOCUMENT
