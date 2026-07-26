# Sprint 01 Risk Register

| ID | Risk | Probability | Impact | Mitigation | Exit evidence |
|---|---|---:|---:|---|---|
| R-01 | Local setup differs across Windows and Linux | Medium | High | Docker Compose, pinned tools, documented commands | Clean-machine smoke test |
| R-02 | Feature work enters foundation sprint | High | Medium | Strict exclusions and backlog review | No out-of-scope modules merged |
| R-03 | Database schema becomes prematurely complex | Medium | High | Only identity, audit and configuration baseline | Migration review |
| R-04 | Environment variables are undocumented | Medium | High | Typed environment parser and `.env.example` | Startup fails clearly on invalid config |
| R-05 | CI and local checks diverge | Medium | Medium | Same package scripts used locally and in CI | CI workflow calls package scripts |
| R-06 | Health endpoint reports false readiness | Medium | High | Readiness performs bounded DB probe | Integration test with DB unavailable |
| R-07 | Secrets leak into repository | Low | Critical | `.gitignore`, secret scan, documentation | Repository scan |
| R-08 | Framework code leaks into domain layer | Medium | Medium | Dependency rules and code review checklist | Architecture test or lint boundary |
| R-09 | Migrations are edited after application | Medium | High | Immutable migration policy | Review checklist |
| R-10 | Sprint appears complete without evidence | Medium | High | Acceptance traceability matrix | Signed completion report |
