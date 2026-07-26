# Error Handling

## Hata Kategorileri
- ValidationError
- DomainRuleViolation
- NotFoundError
- ConflictError
- AuthorizationError
- ExternalProviderError
- InfrastructureError

## Kurallar
- Domain exception HTTP detaylarını bilmez.
- API katmanı hata kodunu problem details formatına çevirir.
- Kullanıcıya stack trace gösterilmez.
- Retry yalnızca transient hatalarda yapılır.
