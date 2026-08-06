# Runbook: Release Candidate (RC) Deploy

**Scope:** Sprint 20 (S20-T05 / S20-T06). Step-by-step release and RC tagging
for Project LUMI. No automatic production deployment — human approval on the
exact commit SHA is required (per S20 spec, "Out of Scope: otomatik
production deployment without approval").

## When to run

When the release checklist (S20-T01..T04) is fully green:

- [S20-T01] Scope frozen, versions pinned at `0.1.0`, CHANGELOG.md seeded.
- [S20-T02] Reproducible build: `ci.yml` `build` job produces version+sha
  tagged image; Dockerfile carries `IMAGE_VERSION` / `IMAGE_COMMIT_SHA`.
- [S20-T03] Migration rehearsal passed (`.g`:staging-migration-drill.md).
- [S20-T04] Full regression + IDOR security suite green (see
  `docs/07-delivery/lumi/sprint-20/S20-T04_VERIFICATION.md`).

## 1. Tag the exact RC commit

The RC must be built from the **exact reviewed commit SHA**, not a branch tip
that can drift.

```bash
SHA=$(git rev-parse HEAD)   # exact commit under human review/approval
git tag -a "v0.1.0-rc.1" -m "Release Candidate 0.1.0-rc.1 (sha: $SHA)"
git push origin v0.1.0-rc.1
```

Rules:

- Tag format: `v<semver>-rc.<n>` (e.g. `v0.1.0-rc.1`).
- Never re-tag an existing RC tag — cut `rc.2` with a new commit.
- Do **not** push production secrets or config to this repo
  (S20 spec requirement).

## 2. Build the RC image

Use the reproducible build path already validated in S20-T02:

```bash
# ci.yml build job (tags-only, no push)
pnpm build                              # Next export / standalone
node scripts/inject-standalone-deps.mjs # trace drizzle-orm/postgres
docker build -f Dockerfile \
  --build-arg NEXT_PUBLIC_APP_URL=https://lumi.example.com \
  --build-arg IMAGE_VERSION=0.1.0-rc.1 \
  --build-arg IMAGE_COMMIT_SHA=$(git rev-parse HEAD) \
  -t lumi-web:0.1.0-rc.1-sha-$(git rev-parse --short HEAD) .
```

Verify labels:

```bash
docker inspect --format='{{json .Config.Labels}}' lumi-web:0.1.0-rc.1-* | \
  jq '{version: .["org.opencontainers.image.version"], revision: .["org.opencontainers.image.revision"]}'
```

Expected: `version=0.1.0-rc.1`, `revision=<commit sha>`.

## 3. Smoke test the RC image

Run the image against a **staging** Postgres + Redis (compose), then:

- `GET /api/health` → `200`
- One authenticated household-scope flow (e.g. story session `advance`)
  → `200`, householdId matches, no cross-tenant data.

## 4. Human approval gate

**Before any production push**, the product/engineering owner must approve
the exact commit SHA in writing (Slack thread or PR comment). Gate rules:

- Approval is SHA-bound; rebasing the branch after tag invalidates it.
- Security/load/restore gate must pass (S20-T04). No open P0/P1.
- If the smoke test fails: cut a forward-fix PR, re-tag as `rc.2`.

## 5. Release (human-triggered)

Only after SHA-bound approval:

```bash
# Push image to registry
docker tag lumi-web:0.1.0-rc.1-sha-* registry.example.com/lumi/web:0.1.0-rc.1
docker push registry.example.com/lumi/web:0.1.0-rc.1
docker tag lumi-web:0.1.0-rc.1-sha-* registry.example.com/lumi/web:latest
docker push registry.example.com/lumi/web:latest
```

Then deploy (per environment handoff in `release-monitoring.md`).

## Failure handling (no rollback)

Migrations are additive (T03). If a post-release issue is found:

1. Confirm via monitoring (S20-T05 thresholds).
2. Author a **forward-fix** migration + app patch (do NOT roll back).
3. Release as `0.1.1` (or `rc.2` if pre-release).
4. Restore a fresh staging snapshot if data integrity is suspect.

## Verification

- `v0.1.0-rc.1` tag points at the exact approved commit.
- Image labels show `version=0.1.0-rc.1` + `revision=<sha>`.
- Staging smoke test green.
- Owner approval recorded against the SHA.
