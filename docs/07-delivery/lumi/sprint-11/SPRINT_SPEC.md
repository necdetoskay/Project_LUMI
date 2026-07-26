# Sprint 11 — Prompt Registry and Context Builder

**Sprint ID:** LUMI-S11
**Version:** 1.0.0
**Status:** Planned / Agent-ready
**Depends On:** Sprint 09 exit gate; Sprint 10 contracts available
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)

## Goal

Prompt'ları uygulama kodundan ayıran versioned registry ve yalnızca ilgili,
yetkili, bütçelenmiş bağlamı oluşturan Context Builder altyapısını kurmak.

## In Scope

- prompt registry, template/version/status lifecycle;
- typed variables and rendering validation;
- provider-neutral prompt contracts;
- Context Builder orchestration;
- safety, parent policy, active story, emotion, memory, origin package and world context sources;
- relevance filtering and token budget;
- prompt/context audit metadata without sensitive raw content;
- eval fixtures and fallback behavior.

## Out of Scope

- final story generation pipeline;
- RAG platform as separate product;
- autonomous decisions;
- raw private data in prompts/logs;
- prompt edits from production UI.

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S11-T01 | Prompt registry/version model | `packages/prompts` | unit + persistence |
| S11-T02 | Typed template renderer | prompts/rendering | unit + injection |
| S11-T03 | Context source ports | `packages/context` | contract |
| S11-T04 | Relevance/token budget builder | context/application | deterministic unit |
| S11-T05 | Safety/parent precedence | context/policy | security |
| S11-T06 | Eval fixtures and docs | tests, `docs/` | regression |

## Requirements

- Context priority: Safety → Parent Policies → Working/Active Story → Emotional
  State → relevant Long-Term Memory → Knowledge/World context.
- Context Builder içerik üretmez; yalnızca seçer ve paketler.
- Family Space ve Child Profile scope her source adapter'da uygulanır.
- Prompt version immutable publication ve explicit activation kullanır.
- Secret, unauthorized memory ve başka çocuk verisi prompt'a giremez.
- Token budget deterministik truncation/summarization politikası kullanır.

## Acceptance Criteria

- Aynı input/snapshot aynı context manifest'i üretir.
- Yetkisiz memory/world kaydı context'e giremez.
- Parent policy safety kuralını gevşetemez.
- Eksik required variable prompt render'ını durdurur.
- Published prompt değiştirilemez; yeni version gerekir.
- Token budget aşımında öncelik sırası korunur ve finding oluşur.

## Quality Gate and Rollback

Renderer/context unit, source contract, isolation/security, injection,
token-budget ve prompt regression eval testleri zorunludur. Prompt activation
önceki version'a geri alınabilir; history silinmez.

## Coding Agent Mission

Registry ve Context Builder'ı kur. Story metni üretme, bağımsız RAG ürünü
oluşturma veya LLM'ye state mutation yetkisi verme.

## Origin Package Context

Context Builder must be able to include the accepted Origin Package when prompts need first-run continuity, character premise, starting home, nearby NPC seed or first mystery context. It must include only the fields needed for the requested generation task and must respect token and safety budgets.
