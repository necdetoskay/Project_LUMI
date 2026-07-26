# API Security Notes

## Authentication

- Session cookie HttpOnly olmalıdır.
- Production ortamında Secure kullanılmalıdır.
- CSRF koruması auth provider davranışına göre etkinleştirilmelidir.
- Session rotation desteklenmelidir.

## Authorization

Route seviyesinde yalnızca login kontrolü yeterli değildir.

Her domain işlemi:

```text
Authenticated?
→ Role allowed?
→ Household member?
→ Resource household'e bağlı mı?
→ İşlem bu resource üzerinde izinli mi?
```

## Child data

- Child profile ID doğrudan güvenilir kabul edilmez.
- Parent membership her istekte doğrulanır.
- Audit log'a gereksiz çocuk verisi yazılmaz.
- API response minimum veri prensibini uygular.

## Error leakage

Production ortamında SQL, stack trace, provider response veya internal ID ayrıntıları istemciye gönderilmez.

## Idempotency

Idempotency key kullanıcı veya scope ile bağlanmalıdır. Başka kullanıcı aynı key'i kullandığında aynı işlem kabul edilmemelidir.
