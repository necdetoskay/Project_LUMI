# Local infrastructure

Kök dizindeki `.env.example` dosyasını `.env` olarak kopyalayın ve ardından:

```bash
pnpm infra:up
pnpm infra:status
pnpm infra:logs
pnpm infra:down
```

PostgreSQL kalıcı sistem kaynağıdır. Redis yalnızca geçici önbellek olarak kullanılır.

## Portlar

Varsayılan host portları çakışma riskini azaltmak için standart servis
portlarından farklıdır:

| Servis | Container portu | Varsayılan host portu |
| ------ | --------------- | --------------------- |
| PostgreSQL | `5432` | `15432` |
| Redis | `6379` | `16379` |

Docker remote context kullanıldığında host portu yerel bilgisayarda değil, uzak
Docker sunucusunda ayrılır. Çakışma olursa kök `.env` dosyasındaki port ve URL
değerlerini birlikte değiştirin:

```env
POSTGRES_PORT=25432
DATABASE_URL=postgresql://lumi:lumi_local_only@localhost:25432/lumi

REDIS_PORT=26379
REDIS_URL=redis://localhost:26379
```
