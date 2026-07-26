# LUMI — İlk Entegrasyon Testleri

## 1. Amaç

İlk entegrasyon testleri, çekirdek veri akışlarının gerçek PostgreSQL üzerinde uçtan uca doğru çalıştığını doğrular.

---

## 2. Test Ortamı

Tercih edilen yapı:

```text
PostgreSQL test container
gerçek migration zinciri
gerçek Drizzle repository
izole test database veya schema
```

Mock DB kullanılmaz.

---

## 3. Test Başlangıç Akışı

Her test paketi:

```text
1. Test DB başlat
2. Migration uygula
3. Reference seed uygula
4. Test verisini oluştur
5. Testi çalıştır
6. DB temizle
```

---

## 4. Kullanıcı Oluşturma Testi

Doğrulanacaklar:

- User kaydı oluşur.
- Aynı e-posta ikinci kez eklenemez.
- Soft deleted kullanıcı sonrası partial unique davranışı beklenen şekilde çalışır.
- Audit kaydı oluşur.

---

## 5. Household ve Child Profile Testi

Doğrulanacaklar:

- Household owner’a bağlanır.
- Child profile household’a bağlanır.
- Yetkisiz kullanıcı başka household’a child ekleyemez.
- Parental settings varsayılan olarak oluşur.

---

## 6. Dünya Oluşturma Testi

Tek transaction içinde:

```text
world
starting region
starting location
child avatar
default inventory
outbox event
```

oluşturulur.

Bir adım başarısız olursa tüm transaction rollback olmalıdır.

---

## 7. Karakter Trait Testi

- Varsayılan trait değerleri atanır.
- Confidence 0–1 dışında olamaz.
- Aynı trait ikinci kez duplicate oluşturmaz.
- Trait değişimi history veya state change üretir.

---

## 8. Story Session Testi

- Story oluşturulur.
- Story version oluşturulur.
- Session başlatılır.
- Participant eklenir.
- Decision kaydedilir.
- Aynı idempotency key ile duplicate decision oluşmaz.

---

## 9. Simulation Testi

- Simulation run başlatılır.
- Başlangıç ve bitiş zamanı doğrulanır.
- Background action kaydedilir.
- State change append edilir.
- Run tamamlanır.
- Aynı world için çakışan lock davranışı test edilir.

---

## 10. Memory Testi

- Story outcome memory’ye dönüştürülür.
- Memory doğru owner’a bağlanır.
- Importance ve confidence sınırları korunur.
- Related memory link oluşturulur.

---

## 11. Inventory Transfer Testi

- Item instance oluşturulur.
- İlk inventory’ye eklenir.
- Başka inventory’ye transfer edilir.
- Aynı anda iki aktif inventory’de görünmez.
- Item history iki hareketi de içerir.

---

## 12. Media ve AI Cost Testi

- Generation request oluşturulur.
- Response kaydedilir.
- Asset oluşturulur.
- Cost record bağlanır.
- Başarısız generation durumunda asset oluşmaz.
- Retry aynı idempotency key ile duplicate request oluşturmaz.

---

## 13. Outbox Testi

- İş kaydı ve outbox event aynı transaction’da oluşur.
- Rollback durumunda outbox kaydı kalmaz.
- Worker processed işaretler.
- Failed event retry için uygun durumda kalır.

---

## 14. Audit Testi

- Kritik create/update/delete işlemleri audit log üretir.
- Audit log sonradan güncellenemez.
- Actor, entity ve timestamp alanları doludur.

---

## 15. Performans Smoke Testleri

İlk aşamada:

```text
1000 karakter
10000 trait kaydı
10000 state change
1000 story session
```

ile temel query süreleri ölçülür.

Amaç üretim benchmark’ı değil, kötü tasarım sinyallerini erken yakalamaktır.

---

## 16. CI Pipeline

```text
lint
typecheck
unit tests
start postgres
apply migrations
apply reference seed
integration tests
schema drift check
```

---

## 17. Başarı Kriterleri

- Tüm çekirdek akışlar gerçek DB üzerinde çalışır.
- Transaction rollback doğrulanır.
- Unique ve check constraint’ler test edilir.
- Idempotency doğrulanır.
- Outbox atomikliği doğrulanır.
- Migration sıfırdan uygulanabilir.
- Testler birbirinden bağımsızdır.
