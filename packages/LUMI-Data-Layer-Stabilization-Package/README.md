# LUMI — Data Layer Stabilization + Vertical Slice Integration

Bu paket, daha önce hazırlanan yedi veri katmanı paketini tek ve uygulanabilir bir bütün hâline getirir.

## Amaç

- Migration sırasını kesinleştirmek
- Tüm schema export'larını tek noktada toplamak
- Reference seed akışını standardize etmek
- İlk vertical slice'ı uçtan uca çalıştırmak
- Transaction, outbox, idempotency ve audit davranışlarını doğrulamak
- Data layer için release gate tanımlamak

## Vertical Slice

```text
Create User
↓
Create Household
↓
Create Child Profile
↓
Create Universe
↓
Create World
↓
Create Region
↓
Create Location
↓
Create Child Avatar
↓
Create Personal Inventory
↓
Publish Outbox Event
↓
Write Audit Log
```

## Paket sırası

1. Database Foundation
2. Identity + Profile
3. World + Media
4. Character + Inventory
5. Story + Education
6. Simulation + Memory
7. AI + Audit + System
8. Data Layer Stabilization

## Bu paketin çıktısı

Data layer, ilk gerçek uygulama modülünün geliştirilmesine hazır hâle gelir.
