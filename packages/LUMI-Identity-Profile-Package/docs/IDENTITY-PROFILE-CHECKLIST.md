# Identity + Profile Doğrulama Listesi

## Identity

- [ ] Kullanıcı oluşturulabiliyor
- [ ] Aktif kullanıcı e-postası benzersiz
- [ ] Session token benzersiz
- [ ] Account provider bağlantıları çalışıyor
- [ ] User-role ilişkisi çalışıyor
- [ ] Role-permission ilişkisi çalışıyor

## Profile

- [ ] Household oluşturulabiliyor
- [ ] Owner üyelik kaydı oluşuyor
- [ ] Child profile oluşturulabiliyor
- [ ] Preferences kaydı oluşturulabiliyor
- [ ] Interest ağırlığı 0–1 arasında
- [ ] Parental settings varsayılan oluşuyor
- [ ] Soft delete sorguları aktif kayıtları filtreliyor

## Transaction

- [ ] Household + owner + parental settings atomik
- [ ] Hata durumunda rollback oluyor

## Migration

- [ ] Foundation migration sonrasında uygulanıyor
- [ ] Tüm tablolar doğru schema altında
- [ ] Foreign key sırası doğru
- [ ] Constraint ve index isimleri benzersiz

## Test

- [ ] Duplicate email testi başarılı
- [ ] Household transaction testi başarılı
- [ ] Child profile preference testi başarılı
