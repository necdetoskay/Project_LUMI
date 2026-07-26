# Foundation Doğrulama Listesi

## Yapılandırma

- [ ] `DATABASE_URL` doğrulanıyor
- [ ] Production ve test DB ayrılmış
- [ ] Connection pool sınırları tanımlı
- [ ] Logging environment ile kontrol ediliyor

## Schema

- [ ] 13 PostgreSQL schema oluşturuluyor
- [ ] Hiçbir domain tablosu `public` altında oluşturulmuyor
- [ ] `citext` extension kuruluyor
- [ ] `pgcrypto` extension kuruluyor

## Drizzle

- [ ] `drizzle.config.ts` çalışıyor
- [ ] `pnpm db:generate` çalışıyor
- [ ] `pnpm db:check` çalışıyor
- [ ] Migration metadata `system` schema'sında tutuluyor

## Kod

- [ ] UUIDv7 helper çalışıyor
- [ ] Transaction helper çalışıyor
- [ ] Serializable transaction helper çalışıyor
- [ ] Common timestamp kolonları export ediliyor
- [ ] Soft-delete helper export ediliyor

## Test

- [ ] PostgreSQL bağlantı testi başarılı
- [ ] Schema smoke testi başarılı
- [ ] Extension testi başarılı
- [ ] Testler gerçek PostgreSQL üzerinde çalışıyor

## Güvenlik

- [ ] `.env` repoya eklenmiyor
- [ ] Runtime DB kullanıcısı kısıtlı yetkiye sahip
- [ ] Migration DB kullanıcısı ayrı değerlendirildi
