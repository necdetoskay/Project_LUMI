# LUMI Self-Hosted VDS Migration Roadmap

**Status:** Planned  
**Target stage:** Development / test environment first  
**Target host:** Single Linux VDS (initially 4-6 GB RAM class)  
**Last updated:** 2026-08-19

## 1. Goal

Move the LUMI application from provider-dependent hosting to a portable self-hosted deployment that can run on a single Linux VDS during development and testing, while remaining easy to scale later for production.

The migration must keep external AI providers as external services. LLM and image-generation inference are intentionally out of scope for self-hosting in this phase.

## 2. Initial target architecture

```text
Internet
  |
  v
Cloudflare DNS (optional proxy)
  |
  v
Caddy / Nginx
  |
  +---------------------------+
  |                           |
  v                           v
LUMI Next.js/API         Worker + Scheduler
  |                           |
  +-------------+-------------+
                |
        +-------+-------+
        |               |
        v               v
   PostgreSQL          Redis
        |
        v
 Local / S3-compatible storage
        |
        +--> external backup target

External services kept outside VDS:
- OpenRouter / LLM provider
- Image generation provider
```

## 3. Scope

### Included

- LUMI web application
- API/backend runtime
- background workers
- scheduler/cron jobs
- PostgreSQL
- Redis
- local or S3-compatible object storage
- reverse proxy
- HTTPS certificates
- Docker Compose based orchestration
- migrations and seed workflow
- health checks
- logs
- backup and restore procedure
- deployment runbook
- rollback procedure
- staging/test domain
- production portability

### Not included in this phase

- self-hosted LLM inference
- self-hosted image generation models
- Kubernetes
- multi-node database cluster
- high-availability Redis
- load balancer cluster
- multi-region deployment

These can be revisited only after real usage metrics justify them.

## 4. Design principles

1. **Provider portability first** — the deployment must not depend on Vercel-specific runtime behavior.
2. **Docker Compose as the deployment contract** — local, test, and VDS environments should stay as similar as practical.
3. **Configuration through environment variables** — no provider secrets or host-specific addresses in source code.
4. **Persistent data must live outside disposable containers.**
5. **Backups must leave the physical VDS.**
6. **Storage API should stay S3-compatible where practical** so local storage, MinIO, R2, or another object store can be swapped without rewriting application logic.
7. **Development-stage cost stays low** — optimize for correctness and portability before production capacity.
8. **Scale vertically first, split services later.**

## 5. Migration phases

## Phase 0 — Current-state audit

### Tasks

- inventory all runtime services used by LUMI
- inventory all Vercel-specific settings and assumptions
- inventory PostgreSQL dependencies
- inventory Redis usage
- inventory R2/object-storage usage
- inventory external callbacks/webhooks
- inventory scheduled jobs
- inventory all required environment variables
- verify current Dockerfile builds the production app
- verify all application paths that write to local filesystem
- document required ports
- document current domain/auth callback URLs

### Deliverables

- runtime dependency matrix
- environment variable matrix
- provider dependency list
- migration blockers list

### Exit criteria

No required production behavior remains unidentified.

---

## Phase 1 — Container baseline

### Tasks

- validate and harden root `Dockerfile`
- ensure deterministic production build
- create/standardize `compose.yaml` for self-hosting
- define services:
  - `app`
  - `worker`
  - `scheduler`
  - `postgres`
  - `redis`
  - `caddy` or `nginx`
- add health checks
- add restart policies
- add resource-conscious defaults for development VDS
- create named volumes for persistent services
- make container logs usable with `docker compose logs`

### Exit criteria

A clean Ubuntu machine can start the complete LUMI runtime using Docker Compose.

---

## Phase 2 — Database migration

### Tasks

- run PostgreSQL inside the VDS
- create persistent Postgres volume
- create least-privilege database user
- ensure database port is not exposed publicly
- migrate schema using repository migration scripts
- import development/test data where required
- validate indexes/extensions
- validate application connectivity through Docker network
- create automated database dump command
- create documented restore command

### Exit criteria

LUMI passes functional tests against the VDS-hosted PostgreSQL instance.

---

## Phase 3 — Redis and background jobs

### Tasks

- run Redis inside the VDS
- keep Redis private to Docker network
- validate queue/session/cache behavior
- run worker container independently from web container
- run scheduler independently
- test job retries
- test service restarts
- test idempotency of scheduled jobs where applicable

### Exit criteria

Worker and scheduler workloads survive container restarts without corrupting application state.

---

## Phase 4 — Storage migration

### Development/test recommendation

Use one of these two modes behind the same storage abstraction:

1. local persistent volume, or
2. self-hosted S3-compatible MinIO

Preferred long-term design: keep the application speaking an S3-compatible API.

### Tasks

- identify all current R2 buckets and object key conventions
- verify current storage adapter boundaries
- add configurable S3 endpoint if not already supported
- configure local MinIO or local-storage implementation
- create separate bucket/prefixes for:
  - character assets
  - story assets
  - uploads
  - generated candidates
  - temporary assets
- define lifecycle policy for temporary files
- validate upload/download/delete flows
- validate generated-image approval/slicing flow
- document R2 -> self-hosted and self-hosted -> R2 migration paths

### Important rule

Application data may live on the VDS, but backup copies must not live only on the same VDS disk.

### Exit criteria

LUMI functions normally with R2 disabled, while retaining the ability to switch back to R2 through configuration.

---

## Phase 5 — Reverse proxy, domain and TLS

### Tasks

- install/configure Caddy or Nginx in Compose
- expose only ports 80 and 443 publicly
- map staging/test domain to VDS
- enable automatic TLS
- configure HTTP -> HTTPS redirect
- set forwarding headers correctly
- configure upload/body-size limits
- configure sensible timeouts for long AI-driven requests
- update auth callback/base URLs

### Exit criteria

LUMI is reachable through its HTTPS domain without exposing app, DB, or Redis ports directly.

---

## Phase 6 — Secrets and server hardening

### Tasks

- create production-style `.env` outside Git
- rotate secrets that were tied to previous environments if needed
- configure firewall
- allow SSH only as required
- disable password SSH login after key authentication is confirmed
- disable direct root SSH login where practical
- install unattended security updates or equivalent patch process
- configure fail2ban if appropriate
- verify database/Redis are not internet-accessible
- verify secrets are not present in images or logs
- run gitleaks/secrets checks

### Exit criteria

Only intentionally public services are reachable from the internet.

---

## Phase 7 — Backup and disaster recovery

### Minimum backup set

- PostgreSQL dumps
- object storage/assets
- critical environment/configuration files
- deployment configuration

### Tasks

- daily database dump
- scheduled asset backup
- encrypted off-server backup destination
- backup retention policy
- restore verification procedure
- monthly restore test during development/beta
- document full-server-loss recovery steps

### Required recovery principle

A total VDS loss must be recoverable without relying on the failed VDS disk.

### Exit criteria

A fresh VDS can restore LUMI from documented backups.

---

## Phase 8 — Observability and resource controls

### Tasks

- basic CPU/RAM/disk monitoring
- container health checks
- disk free-space alarms
- Docker log rotation
- PostgreSQL size monitoring
- object storage size monitoring
- uptime monitoring
- optional integration of existing storage/network watcher tooling
- record baseline memory usage for each service

### Initial resource policy

For development/test:

- avoid unnecessary replicas
- keep one Postgres instance
- keep one Redis instance
- keep one app instance
- keep one worker unless tests require more
- use swap as safety margin, not primary memory

### Exit criteria

Resource exhaustion is visible before it becomes an outage.

---

## Phase 9 — CI/CD and deployment workflow

### Stage A

Manual but repeatable deployment:

```bash
git pull
docker compose build
docker compose up -d
docker compose ps
```

### Stage B

Automated deployment after the manual process is stable:

- GitHub Actions build/test
- build immutable application image
- push image to registry
- SSH/deployment action to VDS
- `docker compose pull`
- migration gate
- rolling/restart deployment
- post-deploy health check
- automatic rollback or documented rollback on failure

### Exit criteria

Deployments are reproducible and do not depend on ad-hoc server edits.

---

## Phase 10 — Validation and cutover

### Required validation

- authentication/login
- onboarding flow
- character generation
- world/region generation
- story flow
- image generation integration
- asset approval/delete/regenerate flows
- Test Lab
- background jobs
- scheduler
- database migrations
- Redis-dependent behaviors
- file/object upload and retrieval
- admin/settings flows
- mobile/responsive smoke tests

### Test sequence

1. deploy self-hosted environment under a staging domain
2. run smoke tests
3. run integration tests
4. run E2E tests
5. run Test Lab scenarios
6. allow limited real tester access
7. observe CPU/RAM/disk/error rates
8. fix migration-specific issues
9. only then consider production cutover

### Exit criteria

The VDS environment is functionally equivalent to the existing hosted environment for all required LUMI workflows.

---

## Phase 11 — Vercel/provider decommission

This phase happens only after the self-hosted environment is stable.

### Tasks

- freeze old deployment configuration
- take final DB/storage backup
- switch DNS/domain traffic
- monitor new environment
- keep rollback path temporarily available
- remove obsolete provider secrets
- disable unnecessary paid services
- update operational documentation

### Exit criteria

LUMI no longer requires the old application-hosting provider for runtime operation.

## 6. Proposed VDS filesystem layout

```text
/opt/lumi/
  compose.yaml
  .env
  caddy/
  scripts/
    backup-db.sh
    restore-db.sh
    deploy.sh

/var/lib/lumi/
  postgres/
  redis/
  object-storage/
  backups-local-cache/
```

Secrets must not be committed to the repository.

## 7. Proposed Docker network policy

```text
public network:
  reverse-proxy
  app

private network:
  app
  worker
  scheduler
  postgres
  redis
  object-storage
```

Only reverse proxy ports are publicly exposed.

## 8. Migration risks

| Risk | Mitigation |
|---|---|
| 4 GB RAM pressure during builds | Build in CI/registry later; add swap; upgrade VDS when measurements justify it |
| Disk fills with generated assets | quotas, lifecycle cleanup, monitoring, optional external object storage |
| Single-server failure | off-server backups and tested restore process |
| Provider-specific assumptions in code | Phase 0 audit + adapter boundaries |
| DB migration failure | backup before migration + tested rollback |
| Long-running AI requests timeout | reverse-proxy timeout tuning and background jobs |
| Secrets leakage | external env files, secret rotation, gitleaks |
| Docker image/log disk growth | image prune policy + log rotation |

## 9. Scaling path after development

Do not redesign early. Measure first.

Expected progression:

```text
Development/test
single VDS
  |
  v
larger single VDS
  |
  v
split database/storage if metrics justify it
  |
  v
multiple app/worker nodes only when real traffic requires it
```

The first production scaling action should normally be a VDS resource increase, not a platform rewrite.

## 10. Definition of Done

The self-hosting migration is complete when:

- LUMI runs from a clean VDS using repository-controlled deployment configuration
- web/API, worker, scheduler, PostgreSQL and Redis run successfully
- storage can run without mandatory R2 dependency
- external LLM/image APIs continue to work
- HTTPS/domain configuration is correct
- no DB/Redis/private service is publicly exposed
- backups leave the VDS
- restore procedure has been tested
- all critical LUMI smoke/E2E/Test Lab flows pass
- deployment and rollback procedures are documented
- Vercel/application-hosting dependency can be removed without functional loss

## 11. Recommended execution order

1. Phase 0 current-state audit
2. Phase 1 container baseline
3. Phase 2 PostgreSQL
4. Phase 3 Redis/workers
5. Phase 4 storage
6. Phase 5 HTTPS/domain
7. Phase 6 hardening
8. Phase 7 backup/restore
9. Phase 8 monitoring
10. Phase 9 deployment automation
11. Phase 10 validation/tester access
12. Phase 11 old-host decommission

## 12. Current decision

For the current development/test stage, the preferred strategy is:

- start on a low-cost single VDS
- keep LLM and image-generation inference external
- self-host application runtime, PostgreSQL, Redis, workers and optionally object storage
- do not introduce production-scale infrastructure before usage metrics require it
- keep the deployment portable so the same stack can move to a larger VDS later with minimal application changes
