# Project LUMI -- Paket 18.2

# Image Prompt Builder & Scene Composition Engine

## Amaç

Karakter, çevre ve hikâye bağlamını modelden bağımsız, tutarlı ve
yeniden üretilebilir görsel istemlere (prompt) dönüştüren merkezi üretim
katmanını tanımlamak.

## Mimari

### 1. Scene Analyzer

-   Hikâye sahnesini analiz eder
-   Ana odağı belirler
-   Duygu tonunu çıkarır

### 2. Composition Engine

Belirlenen öğeler: - Karakter yerleşimi - Kamera açısı - Kadraj -
Perspektif - Derinlik - Işık

### 3. Environment Builder

-   Bölge
-   Mevsim
-   Hava durumu
-   Günün saati
-   Arka plan öğeleri

### 4. Prompt Builder

Bileşenler: - Pozitif Prompt - Negatif Prompt - Stil Tanımı - Karakter
Referansları - Sahne Açıklaması - Kalite Parametreleri

## Kompozisyon Kuralları

-   Ana karakter odakta olmalı.
-   Hikâyeyi destekleyen çevre kullanılmalı.
-   Gereksiz nesneler azaltılmalı.
-   Çocuk dostu kompozisyon korunmalı.

## Model Bağımsızlığı

Prompt yapısı farklı görsel modellerine kolayca uyarlanabilecek ortak
bir şablon üzerinden oluşturulur.

## Doğrulama

-   Karakter sayısı
-   Sahne tutarlılığı
-   Stil uyumu
-   Prompt uzunluğu
-   Yasaklı içerik kontrolü

## Test Senaryoları

-   Tek karakter
-   Çoklu karakter
-   İç mekân
-   Dış mekân
-   Gece sahnesi
-   Karmaşık savaş olmayan aksiyon sahnesi

## Çıktılar

-   Final Image Prompt
-   Negative Prompt
-   Scene Manifest
-   Composition Report
