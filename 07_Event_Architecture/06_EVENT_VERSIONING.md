# Event Versioning

## İlkeler
- Event adı sabit kalabilir, `eventVersion` artar.
- Yeni alanlar optional eklenir.
- Alan anlamı değiştirilemez.
- Alan silme yerine deprecation uygulanır.
- Consumer eski versiyonları destekleme süresine sahip olur.

## Dönüşüm
Upcaster katmanı eski event payload'ını güncel modele dönüştürür.

```ts
type EventUpcaster = {
  supports(type: string, version: number): boolean
  upcast(event: StoredEvent): StoredEvent
}
```

## Kırıcı Değişiklik
Anlam değişiyorsa yeni event adı oluşturulur.
