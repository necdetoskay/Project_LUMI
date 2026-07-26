# Project LUMI -- Paket 18.5

# Image Asset Library, Versioning & Delivery System

## Amaç

Üretilen tüm görsellerin yaşam döngüsünü yöneten, güvenli biçimde
saklayan, sürümlerini takip eden ve istemcilere verimli şekilde sunan
merkezi Asset yönetim sistemini tanımlamak.

## Asset Library

Her görsel için tutulur:

-   Asset ID
-   Image ID
-   Character ID (opsiyonel)
-   Story ID
-   Scene ID
-   Asset Type
-   Version
-   Status
-   Created At
-   Updated At

## Asset Türleri

-   Character Portrait
-   Story Page
-   Cover Image
-   Item Icon
-   Location Artwork
-   NPC Portrait
-   UI Asset

## Version Yönetimi

Kurallar: - Her düzenleme yeni sürüm oluşturur. - Eski sürümler
arşivlenir. - Rollback desteklenir. - Aktif sürüm tekildir.

## Metadata

-   Prompt Hash
-   Model Version
-   Style Version
-   Resolution
-   Aspect Ratio
-   Quality Level
-   Cache Key

## Depolama Stratejisi

-   Orijinal dosya
-   Optimize edilmiş kopyalar
-   Thumbnail
-   Web sürümü
-   Mobil sürümü

## Teslim (Delivery)

-   CDN uyumlu yapı
-   Lazy Loading
-   Responsive boyutlar
-   Önbellek başlıkları
-   Güvenli erişim

## Yaşam Döngüsü

Generate ↓ Validate ↓ Store ↓ Version ↓ Publish ↓ Cache ↓ Archive

## Test Senaryoları

-   Yeni asset oluşturma
-   Sürüm yükseltme
-   Rollback
-   Thumbnail üretimi
-   Eksik metadata
-   Büyük ölçekli dağıtım

## Çıktılar

-   Asset Manifest
-   Version History
-   Delivery Report
-   Storage Report
-   Lifecycle Audit
