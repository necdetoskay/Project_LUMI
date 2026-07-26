# SPEC-02 Review Checklist

## Scope
- [ ] Change is limited to workspace/toolchain foundation.
- [ ] No application feature or domain code is included.
- [ ] No unapproved infrastructure service is introduced.

## Determinism
- [ ] pnpm is the only package manager.
- [ ] pnpm version is pinned.
- [ ] Node engine is declared.
- [ ] Lockfile is committed.
- [ ] Frozen installation succeeds.

## Quality Configuration
- [ ] TypeScript strictness matches the specification.
- [ ] ESLint uses flat configuration.
- [ ] Rules were not broadly disabled.
- [ ] Prettier has one canonical root config.
- [ ] Generated directories are ignored.

## Security
- [ ] No real secrets exist.
- [ ] `.env.example` is safe.
- [ ] Root scripts do not download or execute remote code.
- [ ] New dependencies are justified.

## Commands
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm format:check`
- [ ] `pnpm clean`

## Documentation and Traceability
- [ ] Setup documentation is complete.
- [ ] Commit/PR references `LUMI-S01-SPEC-02`.
- [ ] Deviations are documented.
- [ ] Acceptance evidence is attached.

## Decision
- [ ] Approved
- [ ] Approved with recorded minor deviations
- [ ] Changes requested
