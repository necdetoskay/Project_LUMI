# World + Media Doğrulama Listesi

## Media

- [ ] Asset oluşturulabiliyor
- [ ] Storage key benzersiz
- [ ] Variant aynı asset içinde benzersiz
- [ ] Soft delete aktif kayıtları filtreliyor
- [ ] Child avatar foreign key uygulanıyor

## World

- [ ] Universe household'a bağlı
- [ ] World universe'e bağlı
- [ ] Region world'e bağlı
- [ ] Location region'a bağlı
- [ ] Parent region ilişkisi çalışıyor
- [ ] Parent location ilişkisi çalışıyor
- [ ] Self connection engelleniyor
- [ ] Travel cost negatif olamıyor
- [ ] World calendar oluşuyor
- [ ] Initial world state oluşuyor

## Transaction

- [ ] Universe + world + region + location atomik
- [ ] Calendar ve state aynı transaction içinde
- [ ] Hata durumunda rollback oluyor

## Migration

- [ ] Foundation ve Identity/Profile sonrasında uygulanıyor
- [ ] Foreign key sırası doğru
- [ ] Asset FK'leri doğru
- [ ] Self-reference FK'ler doğru
- [ ] Tüm indexler oluşuyor

## Test

- [ ] Asset variant testi başarılı
- [ ] World foundation testi başarılı
