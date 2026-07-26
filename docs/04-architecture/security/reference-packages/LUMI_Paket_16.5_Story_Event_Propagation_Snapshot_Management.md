# Project LUMI -- Paket 16.5

# Story Event Propagation & Snapshot Management

## Amaç

Story Commit işlemi tamamlandıktan sonra oluşan tüm değişikliklerin
evrene kontrollü şekilde yayılması ve gelecekte geri dönüş yapılabilmesi
için snapshot mekanizmasının tanımlanması.

## Bileşenler

### 1. Event Propagation Engine

-   Dünya olaylarını yayınlar.
-   NPC'leri bilgilendirir.
-   Görev sistemini tetikler.
-   Ekonomi simülasyonunu günceller.
-   Dünya haberlerini oluşturur.

### 2. Snapshot Manager

Her başarılı commit sonunda: - World Snapshot - NPC Snapshot - Inventory
Snapshot - Relationship Snapshot - Quest Snapshot

oluşturulur.

### 3. Incremental Snapshot

Tam kopya yerine yalnızca değişen veriler saklanabilir.

Avantajları: - Daha az depolama - Daha hızlı geri dönüş - Daha düşük I/O
maliyeti

### 4. Event Zinciri

Story Finish ↓ Outcome Manifest ↓ Validation ↓ Commit ↓ Snapshot ↓
Propagation ↓ Background Systems ↓ Yeni World State

## Etki Alanları

-   NPC Davranışları
-   İlişkiler
-   Envanter
-   Görevler
-   Yerleşimler
-   Dünya Ekonomisi
-   Söylentiler
-   Hikâye Hafızası

## Hata Yönetimi

-   Başarısız propagation yeniden denenebilir.
-   Snapshot doğrulanmadan aktif hale gelmez.
-   Kritik hata durumunda rollback uygulanır.

## Testler

-   Snapshot oluşturma
-   Incremental snapshot
-   Event propagation
-   Rollback sonrası tutarlılık
-   Büyük ölçekli commit testi

## Çıktılar

-   Snapshot Archive
-   Event Log
-   Propagation Report
-   World Update Summary
