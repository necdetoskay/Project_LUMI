# Acceptance Traceability Matrix

| Criterion | Implementation area | Required test/evidence |
|---|---|---|
| AC-01 | README, package scripts, Compose | Clean-clone setup log |
| AC-02 | Config module | Unit tests for missing/invalid values |
| AC-03 | Compose PostgreSQL | Docker health output |
| AC-04 | ORM migrations | Empty-DB integration test |
| AC-05 | Seed | Seed twice integration test |
| AC-06 | Liveness route | API contract test |
| AC-07 | Readiness route | DB-backed integration test |
| AC-08 | Readiness failure | Dependency unavailable test |
| AC-09 | Version route | API contract test |
| AC-10 | Error mapper | Unit and route tests |
| AC-11 | Session boundary | Protected route test |
| AC-12 | Audit service | Persistence integration test |
| AC-13 | Package scripts | CI log |
| AC-14 | Next.js build | CI build job |
| AC-15 | CI workflow | Successful pull request run |
| AC-16 | Documentation | New-developer walkthrough |

No criterion may be marked complete without linked code and evidence.
