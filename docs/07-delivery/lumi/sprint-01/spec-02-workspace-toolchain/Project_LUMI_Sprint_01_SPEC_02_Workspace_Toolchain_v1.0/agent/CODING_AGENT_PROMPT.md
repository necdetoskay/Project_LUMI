# Coding Agent Prompt — LUMI-S01-SPEC-02

Implement **LUMI-S01-SPEC-02 — Workspace & Development Toolchain Foundation**
exactly as defined in `spec/LUMI-S01-SPEC-02.md`.

## Operating Rules

1. Read repository governance and SPEC-01 artifacts first.
2. Treat approved architecture and EOS documents as higher priority than this
   prompt.
3. Do not implement product features.
4. Do not add authentication, database models, migrations, UI, API routes, AI
   integrations or extra infrastructure.
5. Use pnpm as the only package manager.
6. Keep all root commands cross-platform.
7. Pin the package-manager version and commit the lockfile.
8. Do not weaken strict TypeScript, lint or security rules to force a pass.
9. Do not commit secrets.
10. Stop at the SPEC-02 boundary.

## Required Work

- establish the pnpm workspace;
- configure Turborepo;
- create strict shared TypeScript configuration;
- configure ESLint flat config;
- configure Prettier and EditorConfig;
- normalize `.gitignore`, `.npmrc` and `.env.example`;
- expose all required root scripts;
- document installation and validation;
- run the full verification plan.

## Required Validation

Run and report:

```text
pnpm install
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm clean
```

## Completion Response

Return:

- created files;
- modified files;
- dependencies and reasons;
- command outcomes;
- each acceptance criterion with PASS/FAIL;
- deviations;
- unresolved issues.

Do not continue to SPEC-03.
