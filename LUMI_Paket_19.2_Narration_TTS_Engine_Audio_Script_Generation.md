# Project LUMI -- Paket 19.2

# Narration (TTS) Engine & Audio Script Generation

## Amaç

Hikâye metinlerini yüksek kaliteli, çocuk dostu ve tutarlı seslendirmeye
dönüştüren merkezi TTS (Text-to-Speech) ve Audio Script üretim sistemini
tanımlamak.

## Mimari

### 1. Story Parser

-   Hikâyeyi sayfalara ayırır
-   Diyalogları tespit eder
-   Anlatıcı ve karakter konuşmalarını ayrıştırır

### 2. Audio Script Builder

Her sahne için oluşturur: - Narrator Segment - Character Dialogue -
Ambient Cue - Music Cue - Timing Bilgileri

### 3. Narration Engine

-   Varsayılan anlatıcı
-   Sayfa bazlı üretim
-   Bölüm bazlı yeniden üretim
-   Çoklu dil desteği

### 4. SSML Processor

Desteklenen öğeler: - Duraklama - Vurgu - Konuşma hızı - Pitch ayarı -
Ses seviyesi

## Üretim Akışı

Story ↓ Story Parser ↓ Audio Script ↓ Voice Assignment ↓ SSML Processing
↓ TTS Generation ↓ Validation ↓ Delivery

## Optimizasyon

-   Değişmeyen sayfalar yeniden üretilmez.
-   Ses parçaları cache'den kullanılabilir.
-   Uzun hikâyeler bölüm bölüm işlenir.

## Doğrulama

-   Eksik diyalog kontrolü
-   SSML doğrulaması
-   Ses uzunluğu
-   Senkronizasyon
-   Telaffuz kuralları

## Test Senaryoları

-   Tek anlatıcılı hikâye
-   Çok karakterli diyalog
-   Uzun metin
-   SSML hatası
-   Bölüm yeniden üretimi

## Çıktılar

-   Audio Script
-   SSML Document
-   Narration Manifest
-   Playback Timeline
-   Validation Report
