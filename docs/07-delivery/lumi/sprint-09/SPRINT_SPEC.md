# Sprint 09 — Story Definition and Session

**Sprint ID:** LUMI-S09  
**Version:** 1.0.0  
**Status:** Planned / Agent-ready  
**Depends On:** Sprint 08 exit gate  
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)

## Goal

Versioned Story Definition ile çalışan Story Session'ı ayıran; başlatma,
ilerletme, checkpoint ve güvenli resume sağlayan story domain temelini kurmak.

## In Scope

- Story Definition, immutable Story Version and publication lifecycle;
- chapter, scene and transition structure;
- static and interactive story modes;
- Story Session, participants and active scene;
- session context snapshot and checkpoint;
- pause/resume/complete/abandon lifecycle;
- reflection question and parent-note placeholders/contracts;
- story/session APIs and persistence.

## Out of Scope

- LLM story generation;
- choice consequence evaluation;
- world-state outcome commit;
- media generation;
- full story reader UI.

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S09-T01 | Story definition/version domain | `packages/story/domain` | unit |
| S09-T02 | Story session lifecycle | story/application | state-machine unit |
| S09-T03 | Story/session schema | database/story | PostgreSQL integration |
| S09-T04 | Session APIs | web API | contract + authorization |
| S09-T05 | Checkpoint/resume/idempotency | story/application | integration |
| S09-T06 | Story contracts/docs | `docs/` | review |

## Requirements

- Published Story Version immutable'dır.
- Session tam olarak bir Story Version'a bağlanır.
- Context snapshot story başlangıç world/version bilgisini korur.
- Session transition yalnızca izin verilen state machine üzerinden olur.
- Retry aynı scene veya checkpoint'i iki kez commit edemez.
- Story metni canonical world state'i değiştiremez.

## Acceptance Criteria

- Static ve interactive session başlatılabilir.
- Pause/resume aynı active scene ve participant state'i getirir.
- Invalid transition ve stale version reddedilir.
- Completed session yeniden ilerletilemez.
- Cross-child session erişimi engellenir.
- Checkpoint sonrasında crash/retry duplicate progression üretmez.

## Quality Gate and Rollback

State-machine unit, PostgreSQL lifecycle, API contract, resume/retry,
authorization ve smoke testleri zorunludur. Published content geçmişi
silinmeden yeni version ile düzeltilir.

## Coding Agent Mission

Story Definition ve Session altyapısını uygula. LLM üretimi, consequence veya
world commit davranışı ekleme.

