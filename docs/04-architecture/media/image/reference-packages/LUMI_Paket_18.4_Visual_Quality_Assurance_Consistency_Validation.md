# Project LUMI -- Paket 18.4

# Visual Quality Assurance & Consistency Validation

## Amaç

Üretilen tüm görsellerin LUMI kalite standartlarına uygunluğunu otomatik
olarak doğrulamak; karakter kimliği, sanat stili ve sahne bütünlüğünü
korumak.

## Doğrulama Aşamaları

Image Generated ↓ Technical Validation ↓ Character Validation ↓ Scene
Validation ↓ Style Validation ↓ Safety Validation ↓ Accept / Retry /
Reject

## 1. Technical Validation

-   Dosya bütünlüğü
-   Çözünürlük
-   En-boy oranı
-   Renk profili
-   Bozuk görsel kontrolü

## 2. Character Consistency

-   Visual ID eşleşmesi
-   Yüz hatları
-   Saç ve göz rengi
-   Kıyafet profili
-   Ayırt edici aksesuarlar

## 3. Scene Validation

-   Hikâye ile uyum
-   Karakter sayısı
-   Ortam doğruluğu
-   Kompozisyon dengesi
-   Ana odak kontrolü

## 4. Style Validation

-   Seçilen sanat stili
-   Renk paleti
-   Işıklandırma
-   Görsel dil tutarlılığı

## 5. Safety Validation

-   Çocuk dostu içerik
-   Uygunsuz nesne kontrolü
-   Şiddet ve korku seviyesi
-   Marka / telif riski kontrolü

## Kalite Puanı

Her görsel için: - Teknik Kalite - Karakter Tutarlılığı - Stil
Uygunluğu - Hikâye Uyumu - Genel Kalite Skoru

## Hata Yönetimi

-   Küçük sapma → Prompt Repair
-   Orta sapma → Yeniden üretim
-   Büyük sapma → Alternatif model veya manuel inceleme

## Test Senaryoları

-   Aynı karakter farklı sahneler
-   Farklı sanat stilleri
-   Düşük çözünürlük
-   Hatalı karakter görünümü
-   Güvenlik ihlali

## Çıktılar

-   QA Report
-   Consistency Report
-   Quality Score
-   Retry Report
-   Validation Archive
