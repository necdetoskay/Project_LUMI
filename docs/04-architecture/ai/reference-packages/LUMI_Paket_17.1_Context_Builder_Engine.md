# Project LUMI -- Paket 17.1

# Context Builder Engine

## Amaç

Prompt üretiminden önce yapay zekâya yalnızca gerekli bilgileri
sağlayan, token kullanımını optimize eden ve hikâye tutarlılığını
koruyan Context Builder katmanını tanımlamak.

## Sorumluluklar

-   Aktif karakterleri seçmek
-   İlgili NPC'leri belirlemek
-   Dünya durumunu özetlemek
-   Yakın geçmiş olaylarını eklemek
-   Gereksiz veriyi filtrelemek

## Veri Kaynakları

-   Character Profile
-   World State
-   NPC Memory
-   Relationship Graph
-   Active Quests
-   Inventory
-   Story History
-   Regional Events

## Önceliklendirme

1.  Ana karakter
2.  Aynı bölgedeki NPC'ler
3.  Aktif görevler
4.  Son olaylar
5.  Dünya çapındaki önemli gelişmeler

## Token Optimizasyonu

-   Kısa özetler
-   Yinelenen bilgileri kaldırma
-   Dinamik önem puanı
-   Bölgesel filtreleme

## Çıktı

Context Builder aşağıdaki bölümleri üretir: - Character Context - World
Context - NPC Context - Quest Context - Inventory Context - Constraints

## Kalite Kriterleri

-   Tutarlılık
-   Deterministik seçim
-   Minimum gereksiz token
-   Tekrarlanabilir sonuç

## Test Senaryoları

-   Yeni oyuncu
-   Uzun hikâye geçmişi
-   Çok sayıda NPC
-   Büyük dünya durumu
-   Aynı girdide aynı çıktı doğrulaması
