# SPEC-04 Review Checklist

## Scope
- [ ] Change is limited to local infrastructure.
- [ ] No schema, migration or application integration exists.
- [ ] No production deployment configuration exists.

## Compose Safety
- [ ] Images are pinned.
- [ ] No deprecated Compose version field.
- [ ] No privileged container.
- [ ] No host networking.
- [ ] No Docker socket mount.
- [ ] Ports are configurable and local-facing.
- [ ] Volumes and network are explicit.

## Services
- [ ] PostgreSQL is healthy.
- [ ] Cache is healthy.
- [ ] Optional object storage is profile-controlled.
- [ ] Health checks use valid in-image commands.

## Operations
- [ ] Up command works.
- [ ] Down command preserves data.
- [ ] Status command works.
- [ ] Logs command works.
- [ ] Reset is guarded.
- [ ] Reset targets only LUMI resources.

## Security
- [ ] No real credential exists.
- [ ] `.env` is ignored.
- [ ] Placeholder credentials are marked local-only.
- [ ] No public bucket or trust authentication exists.

## Regression
- [ ] Format passes.
- [ ] Lint passes.
- [ ] Typecheck passes.
- [ ] Tests pass.
- [ ] Build passes.

## Decision
- [ ] Approved
- [ ] Approved with minor documented deviations
- [ ] Changes requested
