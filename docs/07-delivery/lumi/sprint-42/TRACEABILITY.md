# Sprint 42 Traceability

| Decision / behavior | Implementation | ULTEF evidence |
|---|---|---|
| Story-first character creation | `character-onboarding-client-page.tsx` | source contract |
| Technical-copy boundary | character onboarding UI denylist | source contract |
| Existing API semantics preserved | existing five character-bootstrap endpoints | source + runtime contracts |
| Existing-character singleton continuation | status guard + continuation links | runtime + regression suites |
| Origin continuity | existing origin persistence pipeline | Integration / PX character continuity |
| Visual-canon truthfulness | `VISUAL_CANON_CONTRACT.md` + readiness UI | source contract |
| Visual tenant/idempotency requirements | visual canon contract | canonical test backlog; provider-backed DB evidence deferred until adapter exists |
