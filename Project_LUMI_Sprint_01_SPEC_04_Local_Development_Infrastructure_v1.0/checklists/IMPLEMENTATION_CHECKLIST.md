# SPEC-04 Implementation Checklist

## Preparation
- [ ] Read SPEC-01 through SPEC-03.
- [ ] Inspect current environment and infrastructure files.
- [ ] Confirm Docker availability.
- [ ] Create implementation branch.

## Compose
- [ ] Create Compose file.
- [ ] Use pinned PostgreSQL image.
- [ ] Use pinned Redis-compatible image.
- [ ] Add optional object-storage profile if approved.
- [ ] Add dedicated network.
- [ ] Add named volumes.
- [ ] Add PostgreSQL health check.
- [ ] Add cache health check.
- [ ] Bind ports to localhost where supported.
- [ ] Avoid privileged mode and Docker socket mounts.

## Scripts
- [ ] Add `infra:up`.
- [ ] Add `infra:down`.
- [ ] Add `infra:status`.
- [ ] Add `infra:logs`.
- [ ] Add guarded `infra:reset`.
- [ ] Ensure scripts are cross-platform.
- [ ] Preserve exit codes.

## Environment and Docs
- [ ] Extend `.env.example`.
- [ ] Confirm `.env` is ignored.
- [ ] Use local-only placeholder credentials.
- [ ] Document startup and shutdown.
- [ ] Document port conflicts.
- [ ] Document volume persistence.
- [ ] Document guarded reset.
- [ ] Document optional profiles.

## Verification
- [ ] Compose config validates.
- [ ] PostgreSQL becomes healthy.
- [ ] Cache becomes healthy.
- [ ] Status command works.
- [ ] Logs command works.
- [ ] Down preserves data.
- [ ] Restart preserves data.
- [ ] Reset refuses without confirmation.
- [ ] Confirmed reset removes only LUMI local volumes.
- [ ] Root quality commands pass.
- [ ] No out-of-scope code exists.

## Delivery
- [ ] Completion report prepared.
- [ ] Acceptance evidence attached.
- [ ] Review requested.
