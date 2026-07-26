# Docker and Local Runbook

## Prerequisites

- Git
- Node.js version defined by the repository
- Corepack/pnpm
- Docker Desktop with Linux containers

## First startup

```bash
corepack enable
pnpm install
cp .env.example .env.local
docker compose up -d db
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
```

Open:

- application: `http://localhost:3000`
- status: `http://localhost:3000/status`
- liveness: `http://localhost:3000/api/health/live`
- readiness: `http://localhost:3000/api/health/ready`

## Stop

```bash
docker compose down
```

To delete only disposable local data:

```bash
docker compose down -v
```

This command must be clearly documented as destructive.

## Troubleshooting

### Port already in use

Change the host database port in Compose and update `DATABASE_URL`.

### Database is unhealthy

Inspect:

```bash
docker compose ps
docker compose logs db
```

### Migration failed

Do not manually edit an applied migration. Recreate the disposable development database or add a corrective migration.

### pnpm activation problem

Use the Node version pinned by the repository, run `corepack enable`, then activate the required pnpm version defined in `packageManager`.
