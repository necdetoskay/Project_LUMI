# Project LUMI — Sprint 01 / SPEC-04

## Local Development Infrastructure Foundation

- **Spec ID:** LUMI-S01-SPEC-04
- **Version:** 1.0.0
- **Status:** Ready for Implementation
- **Sprint:** Sprint 01 — Project Foundation
- **Priority:** P0
- **Depends on:** SPEC-01, SPEC-02, SPEC-03
- **Governance:** EOS v1.0 / ASDS
- **Primary infrastructure:** Docker Compose
- **Initial services:** PostgreSQL, Redis-compatible cache, object-storage-compatible service (optional profile)

## Purpose

This package defines the local development infrastructure foundation for Project LUMI.
It standardizes how supporting services are started, stopped, inspected and reset
without implementing product-domain schemas or application integrations.

## Package Contents

- `spec/LUMI-S01-SPEC-04.md`
- `checklists/IMPLEMENTATION_CHECKLIST.md`
- `checklists/REVIEW_CHECKLIST.md`
- `agent/CODING_AGENT_PROMPT.md`
- `examples/EXPECTED_INFRA_TREE.txt`
- `examples/COMPOSE_SERVICE_CONTRACT.json`

## Delivery Boundary

The specification creates repeatable local infrastructure only. Database migrations,
application repositories, authentication, story logic and AI services remain out of scope.
