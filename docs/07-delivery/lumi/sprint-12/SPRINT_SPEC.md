# Sprint 12 — Story Generation Pipeline

**Sprint ID:** LUMI-S12  
**Version:** 1.0.0  
**Status:** Planned / Agent-ready  
**Depends On:** Sprint 10 and Sprint 11 exit gates  
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)

## Goal

Context manifest'ten yaşa uygun, tutarlı ve doğrulanmış story scene üreten
provider-neutral AI generation pipeline'ı kurmak.

## In Scope

- generation request/response contracts;
- provider adapter and model routing abstraction;
- prompt composition from approved registry;
- scene, dialogue and choice proposal generation;
- schema, canon, safety and continuity validation;
- bounded repair/retry and deterministic failure states;
- cost/token/latency accounting;
- test provider, fixtures and evaluation suite.

## Out of Scope

- canonical world or character mutation;
- media generation;
- NPC background autonomy;
- Story Outcome Commit System;
- provider-specific SDK leakage into domain/application.

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S12-T01 | Generation contracts/ports | `packages/ai`, story/contracts | unit |
| S12-T02 | Provider adapters/router | ai/infrastructure | contract + fallback |
| S12-T03 | Story pipeline orchestrator | ai/application | integration |
| S12-T04 | Validation/repair pipeline | ai/validation | safety + regression |
| S12-T05 | Usage/cost records | database/ai-usage | integration |
| S12-T06 | Eval dataset/runbook | tests/evals, `docs/` | eval gate |

## Requirements

- AI flow: Intent → Context → Plan → Generate → Validate → approved response.
- LLM output untrusted input olarak schema ve safety validation'dan geçer.
- Provider timeout/failure kullanıcı state'ini bozmaz.
- Repair sayısı sınırlı; sonsuz retry yapılamaz.
- Model/provider seçimi configuration/policy ile yapılır.
- Prompt, context ve output logları privacy/redaction politikasına uyar.

## Acceptance Criteria

- Test provider ile static ve interactive scene üretimi schema-valid çalışır.
- Safety veya canon ihlali kullanıcıya ulaşmadan engellenir.
- Provider timeout fallback/typed error üretir.
- Repair limit aşıldığında güvenli failure oluşur.
- Aynı request retry duplicate session progression üretmez.
- Cost/token/latency kaydı child text'i açığa çıkarmadan tutulur.

## Quality Gate and Rollback

Adapter contract, orchestration integration, schema/property, safety,
continuity, retry/fallback ve golden-eval testleri zorunludur. Provider/model
config rollback edilebilir; story state yalnızca ayrı session command ile
ilerler.

## Coding Agent Mission

Güvenli story generation pipeline'ını uygula. LLM çıktısını canonical gerçeklik
veya doğrudan DB mutation olarak kullanma.

