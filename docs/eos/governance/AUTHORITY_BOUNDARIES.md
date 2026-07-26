# AUTHORITY_BOUNDARIES.md

Version: 1.0.0
Status: Approved
Classification: Governance

# Authority Boundaries

## Purpose

Bu doküman, insan mühendisler ile AI Coding Agent'larının yetki sınırlarını tanımlar.
Amaç, mimari bütünlüğü korumak ve kontrolsüz değişiklikleri önlemektir.

## Human Authority

Yalnızca insan mühendis aşağıdaki kararları alabilir:

- Sistem mimarisini değiştirmek
- Yeni teknoloji seçmek
- Veritabanı mimarisini değiştirmek
- Güvenlik politikalarını belirlemek
- API sözleşmelerini onaylamak
- Sprint kapsamını değiştirmek
- Üretim ortamına yayın onayı vermek

## Coding Agent Authority

AI Coding Agent aşağıdaki işlemleri yapabilir:

- Onaylı Task Specification'ı uygulamak
- Yeni dosyalar oluşturmak
- Mevcut kodu iyileştirmek
- Test yazmak ve güncellemek
- Dokümantasyonu güncellemek
- Kod kalitesini artıran küçük refactoring işlemleri yapmak

## Coding Agent Restrictions

AI aşağıdaki işlemleri insan onayı olmadan yapamaz:

- Mimariyi değiştirmek
- Yeni bağımlılık eklemek
- Veri kaybına neden olabilecek migration hazırlamak
- Kimlik doğrulama veya yetkilendirme mantığını değiştirmek
- Gizli anahtarları veya güvenlik ayarlarını değiştirmek
- Kapsam dışı özellik eklemek

## Escalation Required

Aşağıdaki durumlarda işlem durdurulur ve insan onayı beklenir:

- Çelişkili Specification
- Eksik Acceptance Criteria
- Performans riski
- Güvenlik riski
- Veri modeli değişikliği
- Üçüncü taraf servis entegrasyonu

## Guiding Principle

AI önerir ve uygular.
İnsan karar verir ve onaylar.

END OF DOCUMENT
