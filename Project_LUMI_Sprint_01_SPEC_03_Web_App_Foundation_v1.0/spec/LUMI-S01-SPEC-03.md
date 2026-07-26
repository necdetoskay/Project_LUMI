# LUMI-S01-SPEC-03 — Web Application Foundation

## 1. Specification Metadata

| Field | Value |
|---|---|
| Project | Project LUMI |
| Sprint | Sprint 01 — Project Foundation |
| Task ID | LUMI-S01-SPEC-03 |
| Title | Web Application Foundation |
| Version | 1.0.0 |
| Status | Ready for Implementation |
| Priority | P0 |
| Depends On | LUMI-S01-SPEC-01, LUMI-S01-SPEC-02 |
| Owner | Human Engineer |
| Implementer | Coding Agent |
| Reviewer | Human Reviewer |

---

## 2. Goal

Create the first runnable web application inside the LUMI monorepo.

The application must:

- run locally;
- build successfully;
- follow the workspace contracts established by SPEC-02;
- provide a clean application shell;
- establish layout, styling and component conventions;
- remain free of business-domain implementation.

The completed app is the technical host for future LUMI features.

---

## 3. Engineering Rationale

Project LUMI requires a stable user-facing application surface before domain
features are introduced. This specification validates that the repository,
package manager, task orchestration and shared tooling can support a real web app.

The goal is not to create a prototype page. The goal is to create a production-shaped
foundation with clear boundaries and no speculative product logic.

---

## 4. Preconditions

1. SPEC-01 repository bootstrap is complete.
2. SPEC-02 workspace and shared toolchain are complete.
3. Root commands execute successfully.
4. The repository has a valid pnpm workspace.
5. No conflicting existing app is present, or conflicts are documented.

---

## 5. In Scope

### 5.1 Application Creation

Create a web application under:

```text
apps/web
```

Use:

- Next.js App Router;
- React;
- TypeScript;
- Tailwind CSS;
- ESLint integration through the shared repository configuration.

### 5.2 Application Shell

Create:

- root layout;
- root page;
- global stylesheet;
- metadata foundation;
- base responsive container;
- minimal application header;
- minimal main content region;
- minimal footer;
- application health endpoint or equivalent basic runtime proof.

### 5.3 UI Foundation

Establish:

- typography defaults;
- spacing conventions;
- color tokens through CSS variables;
- accessible focus styles;
- reusable utility helpers;
- component directory convention;
- readiness for future Shadcn UI integration.

No complete design system is required.

### 5.4 Configuration

Configure:

- application-level `package.json`;
- TypeScript extension from shared base;
- Next.js configuration;
- PostCSS/Tailwind configuration as required by the selected framework version;
- environment type declaration;
- route and import conventions;
- package scripts.

### 5.5 Root Integration

Ensure root commands include the new app through Turborepo:

```text
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

The root may also expose:

```text
pnpm dev
```

for local development orchestration.

---

## 6. Out of Scope

Do not implement:

- authentication;
- user registration;
- child profiles;
- parent accounts;
- database connectivity;
- Drizzle schemas;
- API business routes;
- world creation;
- character creation;
- story generation;
- AI providers;
- image generation;
- audio or TTS;
- background workers;
- Redis;
- object storage;
- analytics;
- production deployment;
- complete design system;
- marketing website;
- admin panel.

---

## 7. Required Application Structure

```text
apps/web/
├── app/
│   ├── api/
│   │   └── health/
│   │       └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── layout/
│   │   ├── app-footer.tsx
│   │   └── app-header.tsx
│   └── ui/
│       └── .gitkeep
├── lib/
│   ├── env.ts
│   └── utils.ts
├── public/
│   └── .gitkeep
├── tests/
│   └── smoke.test.ts
├── next-env.d.ts
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

Equivalent framework-version-generated filenames are acceptable when technically
required, but the architectural intent must remain unchanged.

---

## 8. Technical Requirements

### 8.1 Framework

- Use the current approved Next.js version in the repository.
- Use App Router only.
- Do not introduce Pages Router.
- Enable React strict behavior where supported.
- Avoid experimental features unless required and documented.
- Avoid framework canary releases.

### 8.2 TypeScript

The app must extend the shared TypeScript configuration.

Requirements:

- strict typing remains enabled;
- no `any` without local justification;
- no suppressed errors;
- no unsafe global path aliases;
- import alias may use `@/*` for the app root;
- test files must be included in validation.

### 8.3 Styling

Use Tailwind CSS and root CSS variables.

Required token groups:

- background;
- foreground;
- muted;
- border;
- primary;
- primary-foreground;
- destructive;
- radius.

The exact visual palette is not finalized in this task.
Tokens must support later dark mode without requiring structural rewrites.

### 8.4 Accessibility

The shell must include:

- valid semantic landmarks;
- keyboard-visible focus styles;
- sufficient default text contrast;
- a single page-level heading;
- descriptive link text;
- no inaccessible icon-only controls;
- a skip-to-content link.

### 8.5 Root Page

The root page must communicate only foundational status.

Allowed content:

- Project LUMI name;
- brief neutral description;
- environment/status indicator;
- implementation-phase notice;
- link or button placeholders that do not claim functionality.

The page must not simulate unavailable product features.

### 8.6 Health Endpoint

Create:

```text
GET /api/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "lumi-web"
}
```

Optional additions:

- application version;
- runtime environment;
- timestamp.

Do not expose secrets, host details or dependency diagnostics.

### 8.7 Environment Handling

Create an environment parser module suitable for future expansion.

At this task boundary:

- only public application-name/version values may be consumed;
- no secret variables are required;
- missing optional values must have safe defaults;
- invalid required values must fail clearly when such values are introduced later.

Do not add database or auth variables as runtime requirements.

### 8.8 Utilities

Create a small `cn` class-name helper only if required by the selected UI setup.

It may use approved utilities such as:

- `clsx`;
- `tailwind-merge`.

Do not add a large utility library.

### 8.9 Testing

Add at least one smoke test that verifies a stable foundational behavior.

Valid examples:

- health response shape;
- root metadata helper;
- environment default behavior;
- utility behavior.

Do not create brittle snapshot tests of the whole page.

### 8.10 Application Scripts

`apps/web/package.json` must expose:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "<approved lint command>",
    "typecheck": "tsc --noEmit",
    "test": "<approved test command>",
    "clean": "<cross-platform cleanup>"
  }
}
```

The exact lint command must match the repository toolchain.
Deprecated framework commands must not be used.

---

## 9. UX Requirements

The page must:

- load without horizontal overflow at common mobile sizes;
- remain readable at 320 px width;
- use a centered content container;
- have a clear header, main and footer;
- avoid animation dependencies;
- avoid remote fonts unless already approved;
- avoid external images;
- avoid fake dashboard metrics;
- avoid sign-in or profile controls before auth exists.

---

## 10. Security Requirements

1. No secret is embedded in client code.
2. No server-only environment value is exposed.
3. Health endpoint returns minimal safe information.
4. No unsafe HTML rendering is used.
5. No external script is loaded.
6. No analytics or tracking is enabled.
7. No permissive CSP claim is added without implementation.
8. No dependency is added without a clear need.

---

## 11. Implementation Steps

1. Inspect SPEC-01 and SPEC-02 outputs.
2. Confirm workspace package conventions.
3. Create `apps/web`.
4. Add the approved Next.js version.
5. Configure TypeScript inheritance.
6. Configure styling.
7. Create root layout.
8. Create root page.
9. Add accessible application shell components.
10. Add the health endpoint.
11. Add environment and utility modules.
12. Add one smoke test.
13. Connect app scripts to Turborepo.
14. Add or validate root `dev` command.
15. Run formatting.
16. Run app and root validation commands.
17. Document local usage.
18. Prepare completion report.

---

## 12. Acceptance Criteria

### AC-01 — Local Development

Given dependencies are installed,
when `pnpm --filter web dev` or the approved equivalent is run,
then the app starts without configuration errors.

### AC-02 — Production Build

`pnpm --filter web build` succeeds.

### AC-03 — Root Build Integration

`pnpm build` includes the web app and succeeds.

### AC-04 — Type Safety

`pnpm --filter web typecheck` and root `pnpm typecheck` succeed.

### AC-05 — Lint

App and root lint commands succeed without broad rule suppression.

### AC-06 — Test

The application smoke test succeeds through app and root test commands.

### AC-07 — Root Route

`GET /` returns the foundational LUMI page without runtime errors.

### AC-08 — Health Route

`GET /api/health` returns HTTP 200 and the required response fields.

### AC-09 — Responsive Shell

The root shell remains usable at mobile, tablet and desktop widths.

### AC-10 — Accessibility Foundation

The page contains semantic landmarks, a skip link, visible focus behavior and one
clear page heading.

### AC-11 — No False Functionality

The page does not present unavailable authentication, story or profile features as
working.

### AC-12 — Scope Protection

No database, auth, AI or domain implementation is added.

---

## 13. Test and Verification Plan

Run:

```text
pnpm install --frozen-lockfile
pnpm --filter web format:check
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter web build
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Runtime verification:

1. Start the web app.
2. Open `/`.
3. Open `/api/health`.
4. Resize viewport to 320 px.
5. Navigate using keyboard only.
6. Confirm no console error.
7. Confirm no network request to unapproved external services.

---

## 14. Definition of Done

- [ ] `apps/web` exists.
- [ ] application runs locally.
- [ ] production build succeeds.
- [ ] root orchestration includes the app.
- [ ] strict TypeScript remains active.
- [ ] lint passes.
- [ ] smoke test passes.
- [ ] health endpoint works.
- [ ] responsive shell exists.
- [ ] accessibility foundation exists.
- [ ] no secret is exposed.
- [ ] no out-of-scope feature is included.
- [ ] local setup documentation is updated.
- [ ] reviewer approval is recorded.

---

## 15. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Next.js version conflicts with tooling | Build failure | Use approved compatible versions |
| Framework-specific lint drift | Quality inconsistency | Extend shared config |
| Premature UI complexity | Rework | Keep shell intentionally minimal |
| Fake product behavior | Misleading baseline | Show only honest foundation status |
| Client exposure of environment data | Security issue | Separate public/server values |
| Unnecessary dependency growth | Maintenance burden | Add only required packages |

---

## 16. Rollback Strategy

1. Revert the SPEC-03 implementation commit.
2. Remove `apps/web`.
3. Restore workspace and lockfile from SPEC-02.
4. Run frozen installation.
5. Run root validation commands.
6. Document the framework/tooling conflict before retrying.

This task must not create persistent user or database data.

---

## 17. Traceability

| Artifact | Required Reference |
|---|---|
| Branch | `sprint-01/spec-03-web-foundation` |
| Commit | Include `LUMI-S01-SPEC-03` |
| Pull Request | Include acceptance checklist |
| Test Evidence | Attach command results |
| Runtime Evidence | Record `/` and `/api/health` checks |
| Review | Record deviations and approval |

---

## 18. Coding Agent Constraints

The coding agent must not:

- implement login or registration;
- add database connectivity;
- create product navigation for nonexistent modules;
- add story, world, character or child domain code;
- add analytics;
- add cloud deployment;
- use remote UI templates;
- introduce a second styling system;
- weaken shared tooling rules;
- continue to SPEC-04.

---

## 19. Required Completion Report

Return:

1. created files;
2. modified files;
3. dependencies and reasons;
4. root and app command results;
5. acceptance criteria PASS/FAIL table;
6. runtime verification results;
7. deviations;
8. unresolved issues;
9. next recommended task without implementing it.

---

## 20. Next Specification Boundary

The next specification should establish either:

- local development infrastructure and service orchestration; or
- shared application configuration and runtime contracts;

according to the approved Sprint 01 sequence.

SPEC-03 ends with one clean, runnable and testable web application shell.
