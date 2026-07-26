# Paket 04 — Authentication & Authorization

## Amaç
Ebeveyn, çocuk profili, yönetici ve sistem servisleri arasında güvenli kimlik ve yetki yönetimi sağlamak.

## Kararlar
- Ebeveyn hesabı ana güvenlik öznesidir.
- Çocuk profili bağımsız giriş hesabı değildir.
- RBAC + resource ownership birlikte kullanılır.
- Hassas ebeveyn işlemlerinde yeniden doğrulama uygulanır.
