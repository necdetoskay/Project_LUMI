# 06 — Architecture Standard

**Document ID:** EOS-STD-006  
**Version:** 1.0.0  
**Status:** Approved

## Purpose

Define architecture before implementation and preserve clear responsibilities.

## Principles

- Business rules are independent from delivery mechanisms.
- Dependencies point toward the domain.
- Architecture decisions are explicit.
- Simplicity is preferred unless scale or risk justifies complexity.

## Logical Layers

Presentation → Application → Domain  
Infrastructure supports the other layers and does not own business rules.

## Required Practices

- Create an architecture document.
- Record significant decisions using ADRs.
- Define authentication, authorization, data ownership, logging, and integrations.
- Identify failure modes, operational risks, and security boundaries.
- Define observability needs: logs, metrics, monitoring, tracing where justified.

## Anti-Patterns

- Framework-specific logic inside the domain
- Shared database tables without ownership
- Architecture that cannot be explained simply
- Hidden integration contracts
- Technology chosen only because it is fashionable

## Exit Criteria

Architecture is approved when responsibilities, boundaries, dependencies, data flow, and key decisions are documented.
