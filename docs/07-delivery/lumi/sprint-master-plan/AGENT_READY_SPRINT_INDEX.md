# Project LUMI Agent-Ready Sprint Index

**Version:** 1.0.0

**Status:** Planned / Agent-ready

**Last Updated:** 2026-07-26

## Authority and Usage

Her sprint önce
[Agent-Ready Sprint Standard](AGENT_READY_SPRINT_STANDARD.md), ardından kendi
specification dosyası ile uygulanır. Bu indeks uygulama yetkisi vermez.

İlk kurulum ve çalışan ürün çekirdeği için uygulama sırası ayrıca
[`Initial Implementation Track v1`](../initial-implementation-track-v1.md)
belgesine göre checkpoint bazlı doğrulanır. Bu belge sprintleri değiştirmez;
hangi parçaların önce çalıştırılıp test edileceğini netleştirir.

| Sprint | Scope | Specification | Status |
| --- | --- | --- | --- |
| 01 | Project Foundation | [Sprint 01](../sprint-01/) | Active / Stabilization |
| 02 | Authentication & Parent Account | [Sprint 02](../sprint-02/SPRINT_SPEC.md) | Planned / Agent-ready |
| 03 | Household & Child Profiles | [Sprint 03](../sprint-03/SPRINT_SPEC.md) | Planned / Agent-ready |
| 04 | PostgreSQL Domain Core | [Sprint 04](../sprint-04/SPRINT_SPEC.md) | Planned / Agent-ready |
| 05 | Observability & Operations Baseline | [Sprint 05](../sprint-05/SPRINT_SPEC.md) | Planned / Agent-ready |
| 06 | Character Domain | [Sprint 06](../sprint-06/SPRINT_SPEC.md) | Planned / Agent-ready |
| 07 | Inventory & Persistent Objects | [Sprint 07](../sprint-07/SPRINT_SPEC.md) | Planned / Agent-ready |
| 08 | World, Region & Home Domain | [Sprint 08](../sprint-08/SPRINT_SPEC.md) | Planned / Agent-ready |
| 09 | Story Definition & Session | [Sprint 09](../sprint-09/SPRINT_SPEC.md) | Planned / Agent-ready |
| 10 | Choice & Session Consequence | [Sprint 10](../sprint-10/SPRINT_SPEC.md) | Planned / Agent-ready |
| 11 | Prompt Registry & Context Builder | [Sprint 11](../sprint-11/SPRINT_SPEC.md) | Planned / Agent-ready |
| 12 | Story Generation Pipeline | [Sprint 12](../sprint-12/SPRINT_SPEC.md) | Planned / Agent-ready |
| 13 | NPC Intelligence Foundation | [Sprint 13](../sprint-13/SPRINT_SPEC.md) | Planned / Agent-ready |
| 14 | World Time & Background Simulation | [Sprint 14](../sprint-14/SPRINT_SPEC.md) | Planned / Agent-ready |
| 15 | Image, Voice & Audio Pipeline | [Sprint 15](../sprint-15/SPRINT_SPEC.md) | Planned / Agent-ready |
| 16 | Story Reader & Interaction UX | [Sprint 16](../sprint-16/SPRINT_SPEC.md) | Planned / Agent-ready |
| 17 | World Map, Characters & Inventory UX | [Sprint 17](../sprint-17/SPRINT_SPEC.md) | Planned / Agent-ready |
| 18 | Parent Panel & Safety Controls | [Sprint 18](../sprint-18/SPRINT_SPEC.md) | Planned / Agent-ready |
| 19 | Security, Cost, Performance & Reliability | [Sprint 19](../sprint-19/SPRINT_SPEC.md) | Planned / Agent-ready |
| 20 | Release Candidate | [Sprint 20](../sprint-20/SPRINT_SPEC.md) | Planned / Agent-ready |

## Backlog Exclusions

Aşağıdaki çalışmalar bu plan içinde etkinleştirilmemiştir:

- NPC Emergent Interaction Engine;
- Story Outcome & World State Commit System;
- Story Outcome gerçek senaryo validation planı;
- diğer `docs/08-backlog/` kayıtları.

Sprint 13 yalnızca NPC intelligence foundation geliştirir. Sprint 10 yalnızca
story session içindeki doğrulanmış choice/consequence kayıtlarını üretir; world
state commit backlog sistemini uygulamaz.

Sprint 15 ve Sprint 16 birlikte
[`Interactive Story Image Hotspots`](../../../04-architecture/media/interactive-story-image-hotspots.md)
kararını uygular: hikaye görsellerinde sınırlı sayıda güvenli SFX, keşif,
ipucu veya seçim hotspot'u gösterilebilir. Hotspot etkileşimi doğrudan canonical
world state değiştirmez; world state etkisi gerekiyorsa ayrıca doğrulanmış story
choice/outcome kaydı gerekir.

Sprint 09, Sprint 10 ve Sprint 16 birlikte
[`Story Challenge and Puzzle Encounters`](../../../04-architecture/story-experience/story-challenge-puzzle-encounters.md)
kararını ilk basit kapsamda uygular: observation, inventory ve empathy
challenge'ları story reader içinde gösterilebilir. Her challenge success,
assisted ve alternate continuation yoluna sahip olmalı; çocuk çözemediğinde
hikaye kilitlenmemelidir.
