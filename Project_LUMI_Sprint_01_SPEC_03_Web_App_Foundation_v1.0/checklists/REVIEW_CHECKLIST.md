# SPEC-03 Review Checklist

## Scope
- [ ] Only the web application foundation is implemented.
- [ ] No auth, database, AI or domain feature exists.
- [ ] No production deployment configuration was added.

## Architecture
- [ ] App is located under `apps/web`.
- [ ] App Router is used.
- [ ] Shared TypeScript/tooling is extended.
- [ ] Root Turborepo commands include the app.

## Runtime
- [ ] Root page loads.
- [ ] Health endpoint returns HTTP 200.
- [ ] Production build succeeds.
- [ ] No runtime console error exists.

## UX
- [ ] Header, main and footer are semantic.
- [ ] Skip link exists.
- [ ] Focus state is visible.
- [ ] 320 px layout is usable.
- [ ] Page does not imply unfinished features work.

## Quality
- [ ] Formatting passes.
- [ ] Lint passes.
- [ ] Typecheck passes.
- [ ] Smoke test passes.
- [ ] No broad suppressions were added.

## Security
- [ ] No secrets are exposed.
- [ ] No unsafe HTML is rendered.
- [ ] Health endpoint reveals minimal information.
- [ ] No unapproved external resource is loaded.

## Decision
- [ ] Approved
- [ ] Approved with minor documented deviations
- [ ] Changes requested
