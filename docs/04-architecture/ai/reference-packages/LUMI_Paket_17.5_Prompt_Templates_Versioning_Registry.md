# Project LUMI -- Paket 17.5

# Prompt Templates, Versioning & Prompt Registry

## Amaç

LUMI içerisinde kullanılan tüm prompt şablonlarını merkezi bir kayıt
sistemi üzerinden yönetmek, sürümlemek ve güvenli şekilde dağıtmak.

## Prompt Registry

Her prompt aşağıdaki bilgilerle saklanır:

-   Prompt ID
-   Name
-   Category
-   Version
-   Status
-   Owner
-   Created Date
-   Updated Date

## Kategoriler

-   Story Generation
-   NPC Dialogue
-   World Simulation
-   Image Prompt
-   Story Summary
-   Quiz Generation
-   Parent Guidance

## Prompt Template Yapısı

1.  Metadata
2.  System Prompt
3.  Developer Prompt
4.  Runtime Variables
5.  Output Schema
6.  Validation Rules

## Version Yönetimi

Durumlar: - Draft - Review - Approved - Deprecated - Archived

Kurallar: - Her değişiklik yeni sürüm oluşturur. - Eski sürümler
korunur. - Geri alma (Rollback) desteklenir.

## Prompt Manifest

Her çalıştırmada:

-   Prompt Version
-   Context Version
-   Model Version
-   Template Hash
-   Runtime Variables
-   Execution Time

kaydedilir.

## A/B Test Desteği

Desteklenen senaryolar:

-   Farklı System Prompt
-   Farklı Developer Prompt
-   Farklı Model
-   Farklı Output Schema

Karşılaştırılan metrikler:

-   Hikâye kalitesi
-   Tutarlılık
-   Token maliyeti
-   Yanıt süresi
-   Başarı oranı

## Güvenlik

-   Yetkisiz değişiklik engellenir.
-   Onaysız sürüm üretimde kullanılamaz.
-   Prompt imzaları doğrulanır.

## Test Senaryoları

-   Yeni sürüm oluşturma
-   Rollback
-   A/B testi
-   Manifest doğrulama
-   Yetki kontrolü
-   Eski sürüm yükleme

## Çıktılar

-   Prompt Registry
-   Version History
-   Prompt Manifest
-   A/B Test Report
-   Rollback Report
