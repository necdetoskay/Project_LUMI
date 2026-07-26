# Project LUMI -- Paket 19.1

# Character Voice Identity & Voice Profile Management

## Amaç

LUMI evrenindeki her karakter için benzersiz, tutarlı ve uzun vadede
korunabilir bir ses kimliği oluşturmak ve tüm hikâyelerde aynı
karakterin aynı ses karakteristiğiyle konuşmasını sağlamak.

## Temel İlkeler

-   Her karakter benzersiz bir Voice ID alır.
-   Ses profili merkezi olarak yönetilir.
-   Ses değişiklikleri sürümlenir.
-   Aynı karakter farklı hikâyelerde aynı ses kimliğini korur.

## Voice Profile

Her karakter için aşağıdaki bilgiler saklanır:

-   Character ID
-   Voice ID
-   Voice Version
-   Dil
-   Konuşma Hızı
-   Ses Tonu
-   Perde (Pitch)
-   Enerji Seviyesi
-   Duygusal Aralık
-   Telaffuz Kuralları
-   Konuşma Tarzı

## Duygu Profilleri

Desteklenen temel duygular:

-   Mutlu
-   Üzgün
-   Heyecanlı
-   Meraklı
-   Korkmuş
-   Sakin
-   Kararlı

Her duygu için ayrı konuşma parametreleri tanımlanabilir.

## Diyalog Kuralları

-   Aynı karakter aynı ses profilini kullanır.
-   Duygu değişimi yalnızca izin verilen parametreleri etkiler.
-   Telaffuz kuralları tüm hikâyelerde korunur.

## Version Yönetimi

Her değişiklik:

-   Yeni Voice Version oluşturur.
-   Önceki sürümler arşivlenir.
-   Rollback desteklenir.

## Doğrulama

Kontroller:

-   Voice ID eşleşmesi
-   Profil bütünlüğü
-   Dil doğruluğu
-   Duygu parametreleri
-   Sürüm uyumluluğu

## Test Senaryoları

-   Aynı karakter farklı hikâyelerde
-   Farklı duygular
-   Yeni ses sürümü
-   Rollback
-   Çok karakterli diyalog

## Çıktılar

-   Voice Profile
-   Voice Manifest
-   Version History
-   Consistency Report
