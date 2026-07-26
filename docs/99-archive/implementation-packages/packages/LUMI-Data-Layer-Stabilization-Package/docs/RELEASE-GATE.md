# Data Layer Release Gate

Data layer yalnızca aşağıdaki şartlar sağlandığında stabilize kabul edilir.

## Zorunlu

- [ ] Tüm migration'lar temiz DB üzerinde çalışıyor
- [ ] Tüm migration'lar sıralı uygulanıyor
- [ ] Reference seed iki kez çalıştırıldığında duplicate oluşturmuyor
- [ ] Vertical slice başarıyla tamamlanıyor
- [ ] Late failure tüm transaction'ı rollback ediyor
- [ ] Outbox domain transaction içinde oluşuyor
- [ ] Audit log domain transaction içinde oluşuyor
- [ ] Idempotency replay çalışıyor
- [ ] 10 günlük freeze kuralı test ediliyor
- [ ] Tüm FK ve check constraint'ler aktif
- [ ] Test ortamında schema drift yok
- [ ] Production migration dry-run başarılı

## Bloklayıcı hata örnekleri

- Eksik foreign key
- Duplicate reference data
- Partial transaction commit
- Outbox olmadan domain değişikliği
- Audit olmadan kritik değişiklik
- Aynı item'ın iki inventory'de bulunabilmesi
- Aynı prompt/version veya attempt numarasının duplicate olması
