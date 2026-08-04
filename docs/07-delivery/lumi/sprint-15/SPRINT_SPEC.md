# Sprint 15 — Image, Voice and Audio Pipelines

**Sprint ID:** LUMI-S15  
**Version:** 1.0.0  
**Status:** Implemented / Ready for review  
**Depends On:** Sprint 12 exit gate  
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)

## Goal

Karakter ve sahne tutarlılığını, çocuk güvenliğini, maliyet önizlemesini ve
yeniden kullanımı koruyan provider-neutral image/TTS/audio pipeline kurmak.

## In Scope

- image, TTS and audio provider ports/adapters;
- character visual identity and voice profile references;
- scene/image and narration/audio job contracts;
- cost estimate before generation;
- size/duration/quality policy;
- asset metadata, object storage, cache and lifecycle;
- safety/consistency validation;
- ambient/SFX tag and playback manifest contracts.

## Out of Scope

- provider-specific UI lock-in;
- automatic generation without parent/product policy;
- biometric voice cloning;
- unlimited high-resolution generation;
- final Story Reader UI.

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S15-T01 | Media contracts/provider ports | `packages/media` | contract |
| S15-T02 | Image pipeline/consistency | media/image | integration + golden |
| S15-T03 | TTS/audio pipeline | media/audio | integration |
| S15-T04 | Cost/policy estimator | media/policy | unit |
| S15-T05 | Asset storage/cache lifecycle | database + object storage | integration |
| S15-T06 | Safety/operations docs | `docs/` | review + smoke |

## Requirements

- Generation başlamadan tahmini maliyet ve policy kararı üretilebilir.
- Büyük binary PostgreSQL'te saklanmaz; object storage + metadata kullanılır.
- Aynı asset request fingerprint ile güvenli biçimde cache edilebilir.
- Character identity reference provider prompt'undan ayrıdır.
- Child safety validation başarısız asset'i publish etmez.
- Provider credential ve ham signed URL loglanmaz.

## Acceptance Criteria

- Fake provider ile image/TTS/audio job lifecycle tamamlanır.
- Aynı fingerprint duplicate ücretli generation başlatmaz.
- Cost limit aşımı generation öncesinde bloke edilir.
- Failed job retry idempotent ve bounded'dır.
- Asset Family Space/Child Profile scope dışında okunamaz.
- Character consistency ve safety rejection fixture'ları geçer.

## Quality Gate and Rollback

Provider contract, storage, cache/idempotency, cost boundary, safety,
consistency ve end-to-end job testleri zorunludur. Provider config rollback
edilebilir; failed/unpublished asset referansları temizlenebilir.

## Coding Agent Mission

Media orchestration ve asset lifecycle'ı uygula. Gerçek provider seçimini domain
katmanına sızdırma; maliyet ve güvenlik kapılarını atlama.

