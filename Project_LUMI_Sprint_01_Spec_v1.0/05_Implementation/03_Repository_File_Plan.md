# Repository File Plan

```text
.
├─ .github/
│  └─ workflows/ci.yml
├─ prisma/
│  ├─ migrations/
│  ├─ schema.prisma
│  └─ seed.ts
├─ src/
│  ├─ app/
│  │  ├─ (public)/
│  │  ├─ (protected)/app/
│  │  ├─ api/health/live/route.ts
│  │  ├─ api/health/ready/route.ts
│  │  ├─ api/version/route.ts
│  │  ├─ error.tsx
│  │  ├─ global-error.tsx
│  │  └─ not-found.tsx
│  ├─ components/
│  │  ├─ layout/
│  │  ├─ status/
│  │  └─ ui/
│  ├─ modules/
│  │  ├─ audit/
│  │  ├─ identity/
│  │  └─ system/
│  ├─ lib/
│  │  ├─ config/
│  │  ├─ db/
│  │  ├─ errors/
│  │  ├─ logging/
│  │  └─ validation/
│  └─ test/
├─ tests/
│  ├─ integration/
│  └─ smoke/
├─ .env.example
├─ compose.yaml
├─ package.json
├─ pnpm-lock.yaml
├─ tsconfig.json
└─ README.md
```

## File ownership rules

- Route files translate HTTP to application calls.
- Module repositories contain persistence details.
- Shared libraries must remain small and infrastructure-focused.
- Avoid a generic `utils.ts`.
- Each module should expose a narrow public index.
