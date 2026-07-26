# Project LUMI -- Paket 17.2

# Prompt Composer Engine

## Amaç

Context Builder tarafından hazırlanan verileri standart bir prompt
yapısına dönüştürerek tüm yapay zekâ modellerine tutarlı, güvenli ve
yeniden üretilebilir istekler göndermek.

## Prompt Katmanları

### 1. System Prompt

-   LUMI kuralları
-   Hikâye ilkeleri
-   Güvenlik politikaları
-   Çocuk dostu içerik

### 2. Developer Prompt

-   Teknik yönergeler
-   JSON şemaları
-   Çıktı formatı
-   Zorunlu kurallar

### 3. Runtime Context

-   Karakter
-   Dünya durumu
-   NPC bilgileri
-   Aktif görevler
-   Hafızalar
-   Envanter

### 4. User Input

-   Kullanıcı seçimi
-   Serbest metin
-   Hikâye tercihi
-   Zorluk seviyesi

## Prompt Birleştirme Sırası

1.  System Prompt
2.  Developer Prompt
3.  Runtime Context
4.  User Input
5.  Output Schema

## Çıktı Şeması

-   Story
-   Dialogue
-   Choices
-   Metadata
-   Safety Flags
-   Validation Info

## Güvenlik

-   Prompt Injection koruması
-   Yasaklı içerik filtreleri
-   Uzunluk sınırları
-   Şema zorunluluğu

## Versiyonlama

Her prompt aşağıdaki bilgilerle kaydedilir: - Prompt Version - Template
Version - Context Version - Model Version

## Test Senaryoları

-   Eksik context
-   Büyük context
-   Geçersiz kullanıcı girdisi
-   Şema ihlali
-   Prompt injection denemeleri

## Çıktılar

-   Final Prompt
-   Prompt Manifest
-   Prompt Hash
-   Validation Report
