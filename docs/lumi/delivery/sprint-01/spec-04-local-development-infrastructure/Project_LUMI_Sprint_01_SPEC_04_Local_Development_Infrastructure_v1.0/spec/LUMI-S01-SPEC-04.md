# LUMI-S01-SPEC-04 — Local Development Infrastructure Foundation

## 1. Specification Metadata

| Field | Value |
|---|---|
| Project | Project LUMI |
| Sprint | Sprint 01 — Project Foundation |
| Task ID | LUMI-S01-SPEC-04 |
| Title | Local Development Infrastructure Foundation |
| Version | 1.0.0 |
| Status | Ready for Implementation |
| Priority | P0 |
| Depends On | LUMI-S01-SPEC-01, 02, 03 |
| Owner | Human Engineer |
| Implementer | Coding Agent |
| Reviewer | Human Reviewer |

---

## 2. Goal

Create a deterministic local infrastructure layer for Project LUMI using Docker Compose.

The foundation must allow developers and coding agents to start, stop, inspect and reset
supporting services through documented commands, without requiring hidden machine-specific
configuration.

---

## 3. Engineering Rationale

LUMI will depend on persistent data, caching and eventually binary asset storage.
These dependencies must be reproducible before domain implementation begins.

This specification creates infrastructure contracts only. It does not authorize:

- database schema creation;
- ORM configuration;
- application-level persistence code;
- production infrastructure;
- cloud provider coupling.

---

## 4. Preconditions

1. Repository bootstrap is complete.
2. Workspace and toolchain are operational.
3. The web application foundation exists.
4. Docker Desktop or compatible Docker Engine is available.
5. No production credential is required.
6. Existing infrastructure files are reviewed before changes.

---

## 5. In Scope

### 5.1 Docker Compose Foundation

Create a local Compose definition that supports:

- PostgreSQL;
- Redis-compatible cache service;
- optional S3-compatible object storage through a Compose profile;
- named volumes;
- health checks;
- explicit ports configurable through environment variables;
- restart behavior suitable for local development;
- isolated project network.

### 5.2 Infrastructure Scripts

Provide cross-platform repository scripts for:

```text
pnpm infra:up
pnpm infra:down
pnpm infra:status
pnpm infra:logs
pnpm infra:reset
```

Destructive reset behavior must be explicit and documented.

### 5.3 Environment Template

Extend the repository environment example with inert local-development defaults for:

```text
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_PORT
DATABASE_URL
REDIS_PORT
REDIS_URL
OBJECT_STORAGE_PORT
OBJECT_STORAGE_CONSOLE_PORT
OBJECT_STORAGE_ACCESS_KEY
OBJECT_STORAGE_SECRET_KEY
OBJECT_STORAGE_BUCKET
```

No real secret may be used.

### 5.4 Documentation

Document:

- prerequisites;
- startup;
- shutdown;
- health verification;
- volume behavior;
- reset behavior;
- port-conflict handling;
- Windows and Docker Desktop notes;
- optional service profiles.

---

## 6. Out of Scope

Do not implement:

- Drizzle ORM;
- SQL migrations;
- application database connection;
- Redis client code;
- queue workers;
- object upload APIs;
- authentication;
- seed data;
- production secrets;
- cloud-managed databases;
- Kubernetes;
- Terraform;
- monitoring stack;
- backup automation;
- database admin UI;
- pgAdmin;
- RedisInsight;
- SMTP or email testing services;
- AI model containers.

---

## 7. Required Repository Structure

```text
infra/
├── compose/
│   ├── docker-compose.yml
│   └── README.md
├── postgres/
│   └── .gitkeep
├── redis/
│   └── .gitkeep
└── object-storage/
    └── .gitkeep

scripts/
├── infra-up.mjs
├── infra-down.mjs
├── infra-status.mjs
├── infra-logs.mjs
└── infra-reset.mjs
```

Equivalent cross-platform script organization is allowed if repository conventions differ.

---

## 8. Technical Requirements

### 8.1 Compose Version and Naming

- Use current Docker Compose specification syntax.
- Do not include deprecated top-level `version`.
- Use predictable service names.
- Use a stable Compose project name where supported.
- Avoid container names unless required; prefer Compose-managed naming.
- Place infrastructure under the repository `infra` directory.

### 8.2 PostgreSQL Service

The PostgreSQL service must:

- use an approved stable image version;
- avoid `latest`;
- use environment-variable-driven database name, user and password;
- expose the host port through a configurable variable;
- store data in a named volume;
- include a health check using `pg_isready`;
- avoid mounting unreviewed SQL initialization scripts;
- avoid creating product schemas in this task.

Recommended logical defaults:

```text
database: lumi
user: lumi
host port: 5432
container port: 5432
```

Placeholder passwords must be clearly non-production.

### 8.3 Redis-Compatible Service

The cache service must:

- use an approved stable image version;
- avoid `latest`;
- expose a configurable local port;
- include a health check;
- use a named volume only if persistence is intentionally enabled;
- not be treated as durable source-of-truth storage;
- not enable public network access.

Redis or a protocol-compatible approved alternative may be used based on the architecture baseline.
The selected option must be documented.

### 8.4 Optional Object Storage

An S3-compatible local service may be included under a Compose profile such as:

```text
object-storage
```

It must:

- avoid starting by default unless explicitly approved;
- use pinned image versions;
- expose API and console ports through environment variables;
- use a named volume;
- use placeholder credentials only;
- avoid automatic public bucket policies;
- avoid product-specific buckets beyond a neutral development placeholder.

### 8.5 Network Isolation

- Services must use a dedicated Compose network.
- Ports bind to localhost where supported.
- No service may expose privileged host ports.
- No service may use host networking.
- No privileged container is permitted.
- Docker socket mounting is forbidden.

### 8.6 Volumes

Required named volumes:

```text
lumi_postgres_data
lumi_redis_data
```

Optional:

```text
lumi_object_storage_data
```

The exact Compose-generated prefix may vary.

### 8.7 Health Checks

Health checks must:

- use commands available inside the selected image;
- have reasonable intervals and retries;
- not depend on the application;
- fail clearly when the service is unavailable;
- avoid exposing credentials in logs where possible.

### 8.8 Root Script Contract

Root `package.json` must expose commands equivalent to:

```json
{
  "scripts": {
    "infra:up": "node scripts/infra-up.mjs",
    "infra:down": "node scripts/infra-down.mjs",
    "infra:status": "node scripts/infra-status.mjs",
    "infra:logs": "node scripts/infra-logs.mjs",
    "infra:reset": "node scripts/infra-reset.mjs"
  }
}
```

Scripts must:

- work on Windows, macOS and Linux;
- avoid Bash-only operators;
- preserve Compose exit codes;
- print clear instructions;
- use the repository-root Compose file reliably.

### 8.9 Reset Safety

`infra:reset` is destructive.

It must:

- clearly state that local volumes will be deleted;
- require an explicit confirmation flag or environment opt-in;
- refuse silent deletion;
- never target unrelated Docker volumes;
- never operate on production environments;
- document the exact command required.

An acceptable pattern:

```text
pnpm infra:reset --confirm
```

### 8.10 Environment Separation

- `.env.example` contains placeholders and safe local defaults.
- `.env` remains ignored.
- Compose may load a root `.env` or dedicated ignored infra env file.
- No production environment file is created.
- Variable names must align with future application configuration contracts.

---

## 9. Security Requirements

1. No real credentials.
2. No `latest` image tags.
3. No privileged mode.
4. No Docker socket mounting.
5. No host networking.
6. No public bucket policy.
7. No database trust authentication.
8. No default weak credential described as production-safe.
9. No secrets inside committed Compose files.
10. No service exposed beyond localhost unless documented and approved.
11. Reset scripts must not delete unrelated resources.
12. Infrastructure logs must not intentionally print passwords.

---

## 10. Developer Experience Requirements

The developer must be able to:

1. copy `.env.example` to `.env`;
2. run `pnpm infra:up`;
3. check status with `pnpm infra:status`;
4. inspect logs with `pnpm infra:logs`;
5. stop services with `pnpm infra:down`;
6. intentionally reset local data with the documented guarded command.

A developer must not need to memorize raw Compose paths.

---

## 11. Implementation Steps

1. Inspect existing infrastructure and environment files.
2. Choose approved pinned service image versions.
3. Create the Compose file.
4. Configure network and named volumes.
5. Add PostgreSQL health check.
6. Add cache service health check.
7. Add optional object-storage profile if approved.
8. Add cross-platform Node wrapper scripts.
9. Extend root package scripts.
10. Extend `.env.example`.
11. Verify ignored local environment files.
12. Add infrastructure documentation.
13. Start services.
14. Verify health and connectivity from the host.
15. Stop services without deleting data.
16. Restart and confirm persistence.
17. Test guarded reset behavior.
18. Run existing root validation commands.
19. Prepare completion report.

---

## 12. Acceptance Criteria

### AC-01 — Compose Validation

```text
docker compose -f infra/compose/docker-compose.yml config
```

or the documented equivalent succeeds.

### AC-02 — Service Startup

`pnpm infra:up` starts the required default services without configuration errors.

### AC-03 — PostgreSQL Health

PostgreSQL reaches healthy status.

### AC-04 — Cache Health

The Redis-compatible service reaches healthy status.

### AC-05 — Status Command

`pnpm infra:status` displays the project services and their states.

### AC-06 — Logs Command

`pnpm infra:logs` displays Compose logs without requiring the developer to know the file path.

### AC-07 — Non-Destructive Shutdown

`pnpm infra:down` stops the services while preserving named volumes.

### AC-08 — Persistence

Data written to PostgreSQL remains after a normal down/up cycle.

### AC-09 — Guarded Reset

The reset command refuses destructive execution without explicit confirmation.

### AC-10 — Confirmed Reset

With the documented confirmation, only LUMI local Compose volumes are removed.

### AC-11 — Environment Safety

No real secret is committed and local `.env` files remain ignored.

### AC-12 — Pinned Images

Every service image uses an explicit version tag or immutable digest.

### AC-13 — Root Quality Preservation

Existing format, lint, typecheck, test and build commands continue to pass.

### AC-14 — Scope Protection

No ORM, migration, product schema or application integration is added.

---

## 13. Test and Verification Plan

### 13.1 Static Verification

Check:

- Compose configuration parses;
- environment references have documented defaults;
- image versions are pinned;
- no privileged configuration exists;
- network and volumes are explicit;
- reset script targets only the project Compose stack.

### 13.2 Runtime Verification

Run:

```text
pnpm infra:up
pnpm infra:status
pnpm infra:logs
docker compose -f infra/compose/docker-compose.yml ps
pnpm infra:down
pnpm infra:up
```

Verify:

- PostgreSQL healthy;
- cache healthy;
- ports available on localhost;
- persistence survives ordinary restart.

### 13.3 Reset Verification

1. Attempt reset without confirmation.
2. Confirm refusal and non-zero exit status.
3. Add disposable test data.
4. Execute confirmed reset.
5. Start services again.
6. Confirm only local LUMI data was cleared.

### 13.4 Repository Regression

Run:

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

---

## 14. Definition of Done

- [ ] Compose file exists and validates.
- [ ] PostgreSQL starts and becomes healthy.
- [ ] Cache starts and becomes healthy.
- [ ] Optional object storage follows profile rules.
- [ ] root infrastructure commands exist.
- [ ] normal shutdown preserves data.
- [ ] reset is guarded.
- [ ] environment template is updated.
- [ ] no secret is committed.
- [ ] image versions are pinned.
- [ ] documentation is complete.
- [ ] root regression commands pass.
- [ ] no out-of-scope integration is included.
- [ ] reviewer approval is recorded.

---

## 15. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Host port conflict | Service cannot start | Make ports configurable |
| Docker Desktop unavailable | Local setup blocked | Document prerequisite and diagnostics |
| Weak placeholder credentials reused | Security risk | Label local-only values clearly |
| Destructive reset misuse | Data loss | Require explicit confirmation |
| Unpinned image updates | Non-deterministic behavior | Pin versions |
| Service starts before healthy | Flaky development | Add health checks |
| Windows path/shell differences | Developer friction | Use Node wrapper scripts |
| Scope expands into persistence code | Delayed sprint | Enforce spec boundary |

---

## 16. Rollback Strategy

1. Stop the LUMI Compose project.
2. Revert the SPEC-04 implementation commit.
3. Remove only the created local Compose resources if required.
4. Restore the prior `.env.example` and root scripts.
5. Run SPEC-03 validation commands.
6. Document any Docker compatibility issue before retrying.

Persistent local data must not be deleted during rollback unless explicitly chosen.

---

## 17. Traceability

| Artifact | Required Reference |
|---|---|
| Branch | `sprint-01/spec-04-local-infrastructure` |
| Commit | Include `LUMI-S01-SPEC-04` |
| Pull Request | Include acceptance checklist |
| Compose Evidence | Attach config validation output |
| Runtime Evidence | Attach service health/status output |
| Reset Evidence | Record guarded reset test |
| Review | Record deviations and approval |

---

## 18. Coding Agent Constraints

The coding agent must not:

- add database schemas;
- add migration tooling;
- connect the web application to PostgreSQL;
- add queue consumers;
- add cloud credentials;
- add admin dashboards;
- expose services publicly;
- use privileged containers;
- mount the Docker socket;
- add production deployment files;
- continue to SPEC-05.

---

## 19. Required Completion Report

Return:

1. created files;
2. modified files;
3. selected images and exact versions;
4. environment variables added;
5. command results;
6. service health results;
7. persistence verification;
8. reset-safety verification;
9. acceptance criteria PASS/FAIL;
10. deviations and unresolved issues.

---

## 20. Next Specification Boundary

The next specification may establish application configuration validation,
database client and ORM foundation, or shared package contracts according to the
approved Sprint 01 sequence.

SPEC-04 ends with reproducible local supporting services and no product persistence code.
