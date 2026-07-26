# Sprint 13 — NPC Intelligence Foundation

**Sprint ID:** LUMI-S13  
**Version:** 1.0.0  
**Status:** Planned / Agent-ready  
**Depends On:** Sprint 06, Sprint 08 and Sprint 11 exit gates  
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)

## Goal

NPC'lerin yalnızca erişebildikleri bilgi, kişilik, ihtiyaç, hedef, duygu ve
ilişki bağlamıyla açıklanabilir karar adayları üretmesini sağlayan intelligence
foundation'ı kurmak.

## In Scope

- perception and information-access model;
- belief records with confidence/source;
- need and goal evaluation;
- Decision Context Vector;
- candidate action generation;
- Utility Evaluator and deterministic selector;
- bounded trait/history feedback;
- NPC decision trace and test scenarios.

## Out of Scope

- NPC Emergent Interaction Engine;
- rumor/gift/invitation inbox and World News;
- unrestricted multi-step autonomous execution;
- offline simulation scheduling;
- LLM-controlled utility score or state mutation.

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S13-T01 | Perception/belief model | `packages/npc-intelligence` | unit |
| S13-T02 | Goal/need evaluator | npc-intelligence/goals | table-driven unit |
| S13-T03 | Decision context/vector | npc-intelligence/context | deterministic unit |
| S13-T04 | Candidate/utility selector | npc-intelligence/decision | property tests |
| S13-T05 | Decision trace/events | database/events | integration |
| S13-T06 | Behavior fixtures/docs | tests, `docs/` | regression |

## Requirements

- NPC bilmediği veya algılamadığı bilgiyi kullanamaz.
- Influence, trait, emotion, time sensitivity ve relationship çok boyutludur.
- Utility sonucu tek kaynağın mutlak kararı değildir; ağırlıklar versioned
  policy'dir.
- Decision trace input, aday, skor, eleme ve seçimi açıklar.
- Karar history küçük ve bounded trait feedback üretebilir.
- Child safety ve parent policy candidate filtresinden önce/sonra korunur.

## Acceptance Criteria

- Aynı state/policy deterministic candidate ve seçim üretir.
- Uzak/alakasız bilgi karar context'ine giremez.
- Yaralı NPC'nin ihtiyaç/zaman önceliği uygun biçimde artar.
- Personality boundary dışındaki eylem elenir veya güçlü kanıt gerektirir.
- Decision trace secret/özel veri sızdırmadan açıklanabilir.
- Cross-family NPC/belief erişimi engellenir.

## Quality Gate and Rollback

Decision table, property/invariant, belief access, isolation, deterministic
regression ve PostgreSQL trace testleri zorunludur. Policy version rollback
edilebilir; geçmiş decision trace değiştirilmez.

## Coding Agent Mission

NPC intelligence temelini uygula. Backlog
[NPC Emergent Interaction Engine](../../../08-backlog/lumi/npc-emergent-interaction-engine.md)
kapsamını etkinleştirme.
