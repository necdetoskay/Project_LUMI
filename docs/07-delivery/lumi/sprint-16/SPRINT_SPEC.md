# Sprint 16 — Story Reader and Interaction UX

**Sprint ID:** LUMI-S16  
**Version:** 1.0.0  
**Status:** Planned / Agent-ready  
**Depends On:** Sprint 12 and Sprint 15 exit gates  
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)

## Goal

Çocuğun static veya interactive hikâyeyi güvenli, erişilebilir ve kesintiden
sonra devam edilebilir biçimde okuyup dinleyebildiği Story Reader deneyimini
üretmek.

## In Scope

- story/session list and resume entry;
- scene text, image and audio presentation;
- interactive choice UI with optional hints;
- playback, pause, resume and progress;
- loading/error/offline-safe states;
- reflection questions and age-adaptive controls;
- accessibility, reduced motion and responsive layout;
- session APIs integration and E2E tests.

## Out of Scope

- new story generation architecture;
- world map and character management UI;
- parent analytics dashboard;
- addictive reward loops;
- Story Outcome Commit System.

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S16-T01 | Reader routes/layout/state | `apps/web/app` | component |
| S16-T02 | Scene/media renderer | `apps/web/components/story` | visual/accessibility |
| S16-T03 | Choice/hint interaction | story UI/application client | integration |
| S16-T04 | Resume/playback behavior | story state | E2E |
| S16-T05 | Error/offline/retry UX | web | E2E |
| S16-T06 | Accessibility/UX evidence | tests, `docs/` | audit |

## Requirements

- Server session canonical progression source'udur.
- UI optimistic davranış duplicate choice commit üretemez.
- Hint seçimin kesin sonucunu söylemez ve baskı oluşturmaz.
- Audio zorunlu değildir; metin her zaman erişilebilirdir.
- Focus, keyboard, screen reader, contrast ve reduced-motion desteklenir.
- Dönüşte son committed checkpoint gösterilir.

## Acceptance Criteria

- Static story baştan sona okunur/dinlenir.
- Interactive choice tek kez commit edilir ve doğru scene açılır.
- Refresh/crash sonrası session doğru checkpoint'ten devam eder.
- Media failure metin deneyimini engellemez.
- Keyboard ve ekran okuyucu ana akışı tamamlar.
- Child başka profile ait session'a erişemez.

## Quality Gate and Rollback

Component, accessibility, API integration, duplicate-click, resume, media
failure ve browser E2E testleri zorunludur. Reader feature flag ile geri
alınabilir; session verisi korunur.

## Coding Agent Mission

Mevcut story/session/media sözleşmelerini kullanan reader deneyimini uygula;
domain veya AI mimarisini UI içinde yeniden kurma.

