# LUMI-S01-SPEC-02 — Workspace & Development Toolchain Foundation

## 1. Specification Metadata

| Field | Value |
|---|---|
| Project | Project LUMI |
| Sprint | Sprint 01 — Project Foundation |
| Task ID | LUMI-S01-SPEC-02 |
| Title | Workspace & Development Toolchain Foundation |
| Version | 1.0.0 |
| Status | Ready for Implementation |
| Priority | P0 |
| Depends On | LUMI-S01-SPEC-01 |
| Owner | Human Engineer |
| Implementer | Coding Agent |
| Reviewer | Human Reviewer |

---

## 2. Goal

Create a deterministic monorepo workspace and shared engineering toolchain that
allows all future LUMI applications and packages to be installed, validated,
tested and built through standard root commands.

At completion, a fresh clone must be able to install dependencies and execute
the defined quality commands without hidden local configuration.

---

## 3. Business and Engineering Rationale

LUMI will contain multiple applications, shared domain packages, infrastructure
definitions and long-lived documentation. Without a controlled workspace,
dependencies and conventions will drift between modules.

This task creates the common execution contract for:

- developers;
- coding agents;
- CI pipelines;
- reviewers;
- future application packages.

The workspace is infrastructure for development. It must not introduce product
behavior.

---

## 4. Preconditions

Before implementation begins:

1. SPEC-01 repository bootstrap is completed.
2. The repository root is available.
3. Git history is clean or current uncommitted changes are understood.
4. Node.js and pnpm version policy can be declared.
5. No product feature implementation is mixed into this task.

If SPEC-01 created equivalent files, they must be reviewed and adapted rather
than duplicated.

---

## 5. In Scope

### 5.1 Workspace Management

- Configure a pnpm workspace.
- Configure Turborepo task orchestration.
- Define root package metadata.
- Pin the package manager version.
- Declare the supported Node.js version.
- Add deterministic root commands.

### 5.2 Shared Tooling

- TypeScript base configuration.
- ESLint base configuration.
- Prettier configuration.
- EditorConfig.
- Git ignore rules.
- Environment-file conventions.
- Basic test-runner contract.
- Dependency-boundary conventions.

### 5.3 Initial Workspace Directories

Create or validate these top-level workspace groups:

```text
apps/
packages/
tooling/
infra/
docs/
scripts/
tests/
```

The task may add placeholder files only where Git tracking requires them.

### 5.4 Validation Commands

The following root commands must exist:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
pnpm clean
```

Commands may initially report that no application packages exist, but they must
terminate successfully and must not hide real failures.

---

## 6. Out of Scope

The following must not be implemented in SPEC-02:

- authentication or authorization;
- database tables or migrations;
- Drizzle schemas;
- Next.js product screens;
- API routes;
- child profiles;
- worlds, characters or stories;
- AI provider integration;
- Redis or job workers;
- object-storage integration;
- production deployment;
- GitHub Actions;
- observability stack;
- domain-specific shared packages.

CI configuration belongs to a later specification unless already explicitly
assigned by the Sprint 01 master plan.

---

## 7. Required Repository Structure

```text
project-lumi/
├── apps/
│   └── .gitkeep
├── packages/
│   └── .gitkeep
├── tooling/
│   ├── eslint/
│   │   └── index.mjs
│   └── typescript/
│       └── base.json
├── infra/
│   └── .gitkeep
├── docs/
├── scripts/
│   └── .gitkeep
├── tests/
│   └── .gitkeep
├── .editorconfig
├── .env.example
├── .gitignore
├── .npmrc
├── .prettierignore
├── .prettierrc.json
├── eslint.config.mjs
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.json
```

Equivalent paths may be used only when SPEC-01 or an approved architecture
document already establishes a different canonical name.

---

## 8. Technical Requirements

### 8.1 Runtime and Package Manager

- Use a current LTS Node.js release supported by the selected dependencies.
- Declare the Node requirement in `package.json#engines`.
- Pin pnpm through the `packageManager` field.
- Do not use npm, Yarn or Bun lockfiles.
- Commit `pnpm-lock.yaml`.

Example policy:

```json
{
  "engines": {
    "node": ">=22 <25"
  },
  "packageManager": "pnpm@10.x"
}
```

The exact pnpm patch version must be pinned during implementation.

### 8.2 Workspace Definition

`pnpm-workspace.yaml` must include:

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "tooling/*"
```

Nested package patterns may be added only when needed by actual package layout.

### 8.3 Turborepo

`turbo.json` must define at least:

- `build`;
- `lint`;
- `typecheck`;
- `test`;
- `clean`.

Build outputs must not cache secrets or local environment files.

Recommended behavior:

- `build` depends on upstream builds;
- `lint`, `typecheck` and `test` can run independently per package;
- `clean` is not cached;
- persistent development tasks are not part of this specification unless an app
  already exists.

### 8.4 TypeScript

The base TypeScript configuration must:

- enable `strict`;
- enable `noUncheckedIndexedAccess`;
- enable `exactOptionalPropertyTypes`;
- enable `noImplicitOverride`;
- use modern ECMAScript targets;
- use `moduleResolution` appropriate for bundler-based TypeScript applications;
- prevent emit for validation-only root configuration;
- avoid unsafe path aliases before package boundaries exist.

Root `tsconfig.json` should reference or extend the shared base configuration.

### 8.5 ESLint

The ESLint foundation must:

- use flat configuration;
- support TypeScript;
- fail on lint errors;
- avoid disabling rules globally without justification;
- ignore generated outputs such as `.next`, `dist`, `coverage`, `.turbo`;
- be extendable by future apps and packages.

No framework-specific lint configuration is required until the related app is
created.

### 8.6 Formatting

Prettier must be configured once at the root.

Formatting rules should prioritize consistency over personal style. The config
must cover Markdown, JSON, YAML, TypeScript and JavaScript files.

`format:check` must validate formatting without modifying files.
A separate `format` command may modify files.

### 8.7 Environment Contract

Create `.env.example` containing no secrets.

It must:

- document naming only;
- group future variables by subsystem;
- clearly mark placeholders;
- never include working credentials;
- state that `.env`, `.env.local` and environment-specific secret files are
  ignored by Git.

At this stage, variables may include commented placeholders for:

```text
DATABASE_URL
REDIS_URL
OBJECT_STORAGE_ENDPOINT
OBJECT_STORAGE_ACCESS_KEY
OBJECT_STORAGE_SECRET_KEY
AUTH_SECRET
```

These placeholders do not authorize implementation of those systems.

### 8.8 Git Hygiene

`.gitignore` must cover:

- dependencies;
- build outputs;
- caches;
- coverage;
- logs;
- local environment files;
- IDE-specific local state;
- OS-generated files;
- temporary archives.

It must not ignore:

- `.env.example`;
- lockfiles;
- migration files;
- documentation;
- configuration templates.

### 8.9 Root Script Contract

Root `package.json` must expose:

```json
{
  "scripts": {
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "clean": "turbo run clean && rimraf node_modules .turbo"
  }
}
```

Equivalent cross-platform cleanup tooling is allowed.
Shell commands that only work on Linux must not be used for root scripts.

### 8.10 Dependency Rules

- Runtime dependencies must not be added to the root unless truly shared at
  runtime.
- Tooling dependencies belong in root `devDependencies` or dedicated tooling
  packages.
- Exact versions or controlled ranges must be used consistently.
- Every new dependency must have a clear purpose.
- No product framework package may be added solely for anticipated future use.
- No duplicate formatter or linter stack may be introduced.

---

## 9. Security Requirements

1. No secret may be committed.
2. Environment examples must use inert placeholders.
3. Install scripts from unnecessary packages must be avoided.
4. Dependency additions must be reviewable in the lockfile.
5. Root scripts must not execute downloaded remote scripts.
6. No telemetry or external service registration is permitted by this task.
7. No privileged Docker or host access is required.

---

## 10. Implementation Steps

1. Inspect SPEC-01 output and existing root files.
2. Remove conflicting package-manager artifacts only when safe.
3. Create or normalize root `package.json`.
4. Pin Node and pnpm policy.
5. Configure `pnpm-workspace.yaml`.
6. Add Turborepo.
7. Add shared TypeScript base configuration.
8. Add ESLint flat configuration.
9. Add Prettier and EditorConfig.
10. Normalize `.gitignore` and `.env.example`.
11. Add required directories without product code.
12. Install dependencies with pnpm.
13. Generate and commit `pnpm-lock.yaml`.
14. Run all validation commands.
15. Update repository documentation with setup commands.
16. Record any deviation from this specification.

---

## 11. Acceptance Criteria

### AC-01 — Deterministic Installation

Given a fresh repository clone,
when `pnpm install --frozen-lockfile` is executed,
then dependency installation succeeds using the committed lockfile.

### AC-02 — Single Package Manager

The repository contains:

- one `pnpm-lock.yaml`;
- no `package-lock.json`;
- no `yarn.lock`;
- no Bun lockfile.

### AC-03 — Workspace Discovery

`pnpm list -r --depth -1` executes successfully and recognizes all existing
workspace packages.

### AC-04 — Root Quality Commands

Each command exists and executes without configuration errors:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
```

### AC-05 — Strict TypeScript Policy

The shared TypeScript base config enables the required strictness flags.

### AC-06 — Secret Safety

No real credential, token, password or private endpoint is present in tracked
environment files.

### AC-07 — Cross-Platform Scripts

Root scripts do not depend on Bash-only syntax or Unix-only deletion commands.

### AC-08 — Clean Repository

After running validation commands, generated cache/output directories are either:

- ignored; or
- removed by `pnpm clean`.

### AC-09 — Documentation

The root documentation explains:

- prerequisites;
- installation;
- validation commands;
- workspace layout;
- package creation conventions.

### AC-10 — Scope Protection

No product feature, domain model, database migration or application UI is added.

---

## 12. Test and Verification Plan

### 12.1 Static File Verification

Check existence and parseability of:

- `package.json`;
- `pnpm-workspace.yaml`;
- `turbo.json`;
- `tsconfig.json`;
- ESLint configuration;
- Prettier configuration.

### 12.2 Command Verification

Run:

```bash
corepack enable
pnpm install
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm clean
pnpm install --frozen-lockfile
```

### 12.3 Negative Verification

Confirm:

- `.env` is ignored;
- `.env.example` is tracked;
- an invalid TypeScript sample fails under the base configuration;
- a lint violation causes a non-zero result in a temporary fixture;
- an unformatted temporary fixture is detected by `format:check`.

Temporary fixtures must be removed after verification.

### 12.4 Fresh Clone Verification

Recommended final validation:

1. Clone or copy repository into an empty temporary directory.
2. Run `corepack enable`.
3. Run `pnpm install --frozen-lockfile`.
4. Run all quality commands.
5. Confirm no undocumented manual step is required.

---

## 13. Definition of Done

SPEC-02 is complete only when:

- [ ] all required files exist;
- [ ] the lockfile is committed;
- [ ] root scripts are operational;
- [ ] TypeScript strictness is active;
- [ ] lint and formatting foundations are active;
- [ ] fresh installation succeeds;
- [ ] all acceptance criteria pass;
- [ ] documentation is updated;
- [ ] no out-of-scope product code is included;
- [ ] reviewer approval is recorded.

---

## 14. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Tool versions conflict | Build instability | Pin Node and pnpm; commit lockfile |
| Empty workspace commands fail | Sprint blocked | Configure scripts to handle no-package state honestly |
| Overengineering tooling | Slow delivery | Add only mandatory tools |
| Framework config added too early | Coupling | Delay framework-specific rules |
| Secret accidentally committed | Security incident | Strict ignore rules and placeholder-only env example |
| OS-specific scripts | Developer friction | Use cross-platform Node tooling |
| Duplicate configurations | Drift | One root source of truth |

---

## 15. Rollback Strategy

If the toolchain implementation causes repository instability:

1. Revert the SPEC-02 commit as one atomic change.
2. Restore the last working SPEC-01 state.
3. Remove generated caches and `node_modules`.
4. Reinstall using the restored lockfile state.
5. Document the incompatibility before retrying.

No database or persistent user data is touched by this specification.

---

## 16. Traceability

| Artifact | Required Reference |
|---|---|
| Branch | `sprint-01/spec-02-workspace-toolchain` |
| Commit | Include `LUMI-S01-SPEC-02` |
| Pull Request | Include acceptance checklist |
| Tests | Link command output or CI result |
| Review | Record approved deviations |
| Documentation | Link updated root setup section |

---

## 17. Coding Agent Constraints

The coding agent must not:

- redesign the architecture;
- change the selected database;
- add product functionality;
- create authentication;
- add unapproved cloud services;
- add Docker services not requested here;
- silently weaken lint or TypeScript rules;
- suppress failing tests;
- remove existing documentation;
- change SPEC-01 decisions without reporting the conflict.

When a conflict exists, preserve the approved higher-level decision and document
the issue in the implementation summary.

---

## 18. Required Completion Report

The implementer must return:

1. list of created files;
2. list of modified files;
3. dependency additions with purpose;
4. command results;
5. acceptance-criteria status;
6. deviations or unresolved issues;
7. suggested next task, without implementing it.

---

## 19. Next Specification Boundary

The next specification may create the first runnable application/service
foundation or local infrastructure layer, depending on the approved Sprint 01
sequence.

SPEC-02 itself ends with a stable workspace and common toolchain.
