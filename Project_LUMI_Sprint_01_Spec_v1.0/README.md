# Project LUMI — Sprint 01 Specification Package

**Version:** 1.0  
**Sprint:** 01  
**Status:** Ready for implementation  
**Primary objective:** Establish the executable foundation of Project LUMI without prematurely implementing the full living-universe feature set.

## Sprint outcome

At the end of Sprint 01, the repository must provide:

- A running Next.js application shell.
- A PostgreSQL-backed development environment.
- A versioned database migration baseline.
- Health and readiness endpoints.
- Core project structure and engineering conventions.
- Automated lint, type-check, unit-test, integration-test and build gates.
- Local Docker Compose startup.
- Seeded development data.
- A minimal authenticated application boundary prepared for later child, parent, world and story modules.
- Clear evidence that all acceptance criteria have been met.

## Deliberate exclusions

Sprint 01 does **not** implement story generation, autonomous NPC behavior, world simulation, image generation, TTS, billing, advanced authorization, production deployment, or the full child-profile workflow. Those capabilities remain in subsequent sprint scope.

## Package map

- `00_Governance`: scope, decisions, definitions, risks.
- `01_Product`: product behavior, use cases, acceptance criteria.
- `02_Architecture`: system architecture, module boundaries, security baseline.
- `03_Data`: initial database design, migration and seed rules.
- `04_API`: endpoint contracts and error conventions.
- `05_Implementation`: backlog, task sequence and file plan.
- `06_Quality`: test strategy, traceability and Definition of Done.
- `07_Operations`: Docker, configuration, observability and runbook.
- `08_Handoff`: coding-agent prompt and implementation checklist.

## Source-of-truth rule

When implementation details conflict, use this precedence:

1. Sprint scope and acceptance criteria
2. Architecture decisions
3. API and data contracts
4. Implementation backlog
5. Examples and optional recommendations
