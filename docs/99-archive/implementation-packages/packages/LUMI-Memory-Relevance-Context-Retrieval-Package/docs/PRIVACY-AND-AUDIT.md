# Privacy and Retrieval Audit

## Privacy

Memory metadata içine aşağıdaki alanlar yazılmaz:

- Email
- Telefon
- Açık adres
- Password
- Access token
- Refresh token

Privacy seviyeleri:

- Public
- Household
- Private

## Retrieval audit

Her retrieval işleminde:

- Purpose
- World ID
- Result count
- Selected memory IDs
- Token budget
- Actor

audit log'a yazılır.

Memory text'in tamamı audit state içine tekrar kopyalanmaz.
