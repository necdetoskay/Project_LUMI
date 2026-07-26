# Simulation Policy

## Catch-up sınırı

Varsayılan:

```text
maxCatchUpDays = 10
freezeAfterLimit = true
```

Kullanıcı 10 günden uzun süre dönmezse:

- İlk 10 gün simüle edilir
- Sonraki süre hesaplanmaz
- Dünya freeze olarak işaretlenir
- Kullanıcıya açıklanabilir bir dönüş özeti hazırlanır

## Intensity decay

Örnek yaklaşım:

```text
1. gün: 1.00
2. gün: 0.90
3. gün: 0.80
...
10. gün: minimumIntensity
```

Gerçek dağılım policy değerlerinden hesaplanır.

## Relevance

Her entity çalıştırılmaz.

Öncelik sinyalleri:

- Konumsal yakınlık
- Aktif hedef
- Yaralanma veya condition
- Ana karakter ilişkisi
- Yakın zamandaki etkileşim
- Zamana duyarlılık

## NPC davranışı

NPC yalnızca rutin yapmaz.

Intent adayları:

- Routine
- Goal progress
- Social
- Rumor
- Gift
- Warning
- Exploration
- Rest

Bu yapı ileride NPC Emergent Interaction Engine'e genişletilecektir.
