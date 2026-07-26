# Context Builder

## Amaç
Tüm evreni her çağrıda modele vermek yerine yalnızca ilgili bilgiyi seçmek.

## Bağlam Katmanları
- Zorunlu: aktif çocuk, aktif karakter, mevcut sahne
- Yüksek öncelik: son seçimler, devam eden görevler, yakın NPC’ler
- Orta öncelik: bölgesel olaylar, envanter, ilişkiler
- Düşük öncelik: uzak bölgeler ve eski olaylar

## Token Bütçesi
Her context bölümü için üst sınır bulunur. Aşımda eski olaylar özetlenir veya çıkarılır.
