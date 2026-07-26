# LUMI — Identity + Profile Domain Package

Bu paket, Project LUMI'nin kullanıcı, yetkilendirme, hane ve çocuk profili veri katmanını kurar.

## Paket kapsamı

- Identity domain Drizzle tabloları
- Profile domain Drizzle tabloları
- Drizzle relations tanımları
- Repository interface ve implementasyonları
- Identity/Profile migration dosyası
- Rol ve izin reference seed'leri
- Varsayılan ebeveyn ayarları
- Entegrasyon testleri
- Uygulama notları
- Doğrulama kontrol listesi

## Domain tabloları

### Identity

```text
identity.users
identity.accounts
identity.sessions
identity.roles
identity.permissions
identity.user_roles
identity.role_permissions
```

### Profile

```text
profile.households
profile.household_members
profile.child_profiles
profile.child_preferences
profile.child_interests
profile.parental_settings
```

## Temel iş kuralları

1. Çocuk profili bağımsız giriş hesabı değildir.
2. Kullanıcı e-posta adresi aktif kayıtlar arasında benzersizdir.
3. Household en az bir owner üyeye sahip olmalıdır.
4. Bir kullanıcı aynı household içinde yalnızca bir aktif üyelik kaydına sahip olabilir.
5. Child profile yalnızca bir household'a bağlıdır.
6. Parental settings household seviyesinde tek kayıttır.
7. Roller ve izinler reference seed ile yüklenir.
8. Audit ve outbox kayıtları sonraki system paketi ile bağlanacaktır.

## Kurulum

Bu paket, önceki `LUMI-Database-Foundation-Package` üzerine uygulanmalıdır.

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed:reference
pnpm db:test
```

## Sonraki paket

```text
Paket 3 — World Domain + Media Assets
```
