# AI + Audit + System Implementation Notes

## Provider bağımsızlığı

Uygulama belirli bir AI sağlayıcısına doğrudan bağlanmaz. Provider ve model registry ile text, image ve audio modelleri konfigürasyondan seçilir.

## Prompt versioning

Prompt template version kayıtları immutable tutulur. Üretim çıktısının hangi prompt sürümüyle oluştuğu generation request üzerinden izlenir.

## Maliyet takibi

Maliyet attempt seviyesinde saklanır. `amount` ve `currency` birlikte tutulur. Raporlama sırasında farklı para birimleri otomatik birleştirilmemelidir.

## Transactional outbox

Domain değişikliği ve outbox event aynı transaction içinde yazılmalıdır. Mesaj broker'a doğrudan transaction içinden gönderim yapılmaz.

## Idempotency

Aynı scope ve key için farklı request payload kullanımı hata üretir. Tamamlanmış işlem sonucu tekrar çağrıda replay edilir.

## Audit

Audit log append-only olmalıdır. Kullanıcı veya uygulama arayüzü üzerinden audit kayıtlarının güncellenmesine izin verilmemelidir.

## Jobs

Job tablosu basit ve güvenilir worker altyapısı için başlangıç sağlar. Queue sistemi daha sonra harici broker'a taşınsa bile DB kayıtları operasyon geçmişini koruyabilir.

## Safety review

Çocuklara yönelik üretimler output publish edilmeden önce safety review sonucuna göre değerlendirilmelidir.
