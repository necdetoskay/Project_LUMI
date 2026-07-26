# Local infrastructure

Kök dizindeki `.env.example` dosyasını `.env` olarak kopyalayın ve ardından:

```bash
pnpm infra:up
pnpm infra:status
pnpm infra:logs
pnpm infra:down
```

PostgreSQL kalıcı sistem kaynağıdır. Redis yalnızca geçici önbellek olarak kullanılır.
