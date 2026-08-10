# Sprint 53 — Implementation Status

Status: IN PROGRESS
Date: 2026-08-10
Branch: `s53/character-visual-canon`

## Objective

Implement the first production visual pipeline for LUMI: existing character data -> reproducible visual brief -> provider generation job -> managed candidate assets -> explicit character visual canon selection.

## Current state

- Sprint 52 playable persistent demo is merged to `main`.
- The canonical demo character Lina exists independently of media generation.
- Story media truthfully remains `not_generated`.
- Sprint 53 intentionally starts from domain/application contracts and persistence before visual polish.

## Planned implementation order

1. inspect existing media/provider/storage/domain boundaries;
2. define asset + generation + character-canon persistence contracts;
3. add migrations/repositories/application services;
4. implement deterministic visual-brief builder;
5. add fake image-generation adapter and ULTEF scenarios;
6. wire configured real provider adapter behind an explicit budget/feature boundary;
7. add minimal parent/admin Asset Management workflow;
8. run full regression matrix and close out.

## Guardrails

- no generation side effect during character creation;
- no provider URL as the only persisted asset identity;
- no silent canonical-image replacement;
- no live-provider dependency in required CI;
- no cross-household asset visibility;
- no claim that grid generation is production-ready until crop/split provenance is tested;
- no image-generation spend without explicit configured provider/model and budget boundary.

## Evidence

Pending implementation.
