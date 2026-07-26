# Identity + Profile Implementation Notes

## 1. Auth sağlayıcısı

`identity.accounts` tablosu harici auth sağlayıcıları için hazırdır. Yerel kullanıcılar yalnızca `identity.users.password_hash` kullanabilir.

## 2. Çocuk profili

Çocuk profili doğrudan giriş hesabı değildir. Çocuğun uygulamadaki ilerlemesi ve tercihleri `profile.child_profiles` üzerinden takip edilir.

## 3. Household owner kuralı

Veritabanı tek başına her household için en az bir owner garantisini tam olarak sağlayamaz. Bu kural use-case ve entegrasyon testleriyle korunmalıdır.

## 4. Avatar foreign key

`child_profiles.avatar_asset_id`, Media paketi uygulanana kadar bilinçli olarak foreign key olmadan bırakılmıştır. Media paketiyle birlikte additive migration ile bağlanacaktır.

## 5. Soft delete

`users`, `households` ve `child_profiles` soft delete kullanır. Junction ve ayar tabloları parent cascade ile kaldırılır.

## 6. E-posta benzersizliği

`CITEXT` sayesinde e-posta karşılaştırması case-insensitive olur. Partial unique index yalnızca aktif kayıtlara uygulanır.

## 7. Audit ve outbox

Bu paket henüz audit ve transactional outbox tablosuna yazmaz. System paketi geldiğinde use-case'lere atomik outbox eklenmelidir.
