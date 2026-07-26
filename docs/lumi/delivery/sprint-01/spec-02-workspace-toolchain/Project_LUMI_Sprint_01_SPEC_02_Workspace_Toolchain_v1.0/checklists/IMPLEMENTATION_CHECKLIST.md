# SPEC-02 Implementation Checklist

## Preparation
- [ ] Read SPEC-01 output.
- [ ] Confirm repository root.
- [ ] Check for conflicting lockfiles/configurations.
- [ ] Create implementation branch.

## Workspace
- [ ] Root `package.json` created or normalized.
- [ ] Node engine declared.
- [ ] Exact pnpm version pinned.
- [ ] `pnpm-workspace.yaml` configured.
- [ ] Required workspace directories present.
- [ ] `turbo.json` configured.

## Shared Tooling
- [ ] TypeScript base config added.
- [ ] Strict TypeScript flags enabled.
- [ ] ESLint flat config added.
- [ ] Prettier config added.
- [ ] EditorConfig added.
- [ ] `.npmrc` added where required.
- [ ] `.gitignore` normalized.
- [ ] `.env.example` contains placeholders only.

## Scripts
- [ ] `build`
- [ ] `lint`
- [ ] `typecheck`
- [ ] `test`
- [ ] `format`
- [ ] `format:check`
- [ ] `clean`

## Verification
- [ ] `pnpm install` passes.
- [ ] Frozen-lockfile install passes.
- [ ] Formatting check passes.
- [ ] Lint passes.
- [ ] Typecheck passes.
- [ ] Tests pass.
- [ ] Build passes.
- [ ] Clean command passes.
- [ ] No secret is tracked.
- [ ] No out-of-scope feature was added.

## Delivery
- [ ] README/setup documentation updated.
- [ ] Completion report prepared.
- [ ] Acceptance criteria mapped to evidence.
- [ ] Review requested.
