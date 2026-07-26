# Project LUMI — Sprint 01 / SPEC-02

## Workspace & Development Toolchain Foundation

- **Spec ID:** LUMI-S01-SPEC-02
- **Version:** 1.0.0
- **Status:** Ready for Implementation
- **Sprint:** Sprint 01 — Project Foundation
- **Priority:** P0
- **Depends on:** SPEC-01 — Repository Bootstrap
- **Governance:** EOS v1.0 / ASDS
- **Primary stack:** TypeScript, pnpm, Turborepo, Next.js, Node.js
- **Database direction:** PostgreSQL + Drizzle ORM
- **Infrastructure direction:** Docker Compose

## Purpose

This package defines the second implementation specification of Sprint 01.
Its purpose is to establish a deterministic, reviewable and coding-agent-friendly
workspace and development toolchain before product features are introduced.

## Package Contents

- `spec/LUMI-S01-SPEC-02.md` — canonical task specification
- `checklists/IMPLEMENTATION_CHECKLIST.md` — implementation checklist
- `checklists/REVIEW_CHECKLIST.md` — reviewer checklist
- `agent/CODING_AGENT_PROMPT.md` — ready-to-use coding-agent instruction
- `examples/EXPECTED_WORKSPACE_TREE.txt` — target repository structure
- `examples/package-json-scripts.example.json` — required root script contract

## Implementation Rule

The coding agent must implement only this specification. Authentication,
database domain tables, story generation, AI provider integration and UI features
are explicitly outside this task.
