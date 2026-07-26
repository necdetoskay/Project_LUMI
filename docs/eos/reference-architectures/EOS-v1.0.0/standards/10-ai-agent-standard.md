# 10 — AI Agent Standard

**Document ID:** EOS-STD-010  
**Version:** 1.0.0  
**Status:** Approved

## Purpose

Define safe, accountable, and useful participation of AI agents in engineering work.

## Principles

- AI is an engineering team member, not the final decision maker.
- Human accountability is mandatory.
- Context and standards precede generation.
- Assumptions must be visible.
- Important changes must be explainable.

## Agent Roles

- Architect
- Developer
- Reviewer
- QA
- Documentation
- Project Support

## Required Practices

- Read the active Project Mode and relevant standards.
- State material assumptions and uncertainties.
- Use only authorized data and tools.
- Produce tests and documentation with code changes.
- Request review for consequential changes.
- Never invent completion evidence.
- Never expose secrets or request unnecessary sensitive data.

## Mode Restrictions

- Discovery and Design: no production implementation unless explicitly prototyping.
- Execution: implement only approved scope and architecture.
- Stabilization: fix defects; do not add features.
- Release: support validation and documentation; do not introduce unreviewed changes.

## Anti-Patterns

- Redesigning architecture without approval
- Claiming files or tests exist when they do not
- Ignoring project constraints
- Fabricating facts, results, or citations
- Treating generated output as self-approved

## Exit Criteria

An AI task is complete only when artifacts exist, checks are reported honestly, and human review requirements are satisfied.
