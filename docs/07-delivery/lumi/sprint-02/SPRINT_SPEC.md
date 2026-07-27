# Sprint 02 - Authentication and Parent Account

**Sprint ID:** LUMI-S02  
**Version:** 1.0.0  
**Status:** Active / In Progress  
**Depends On:** Sprint 01 exit gate  
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)

## Goal

Ebeveyn hesabi icin guvenli registration, login, session, logout ve temel
authorization altyapisini uretmek.

## Implementation Snapshot - 2026-07-27

Su an repo icinde calisan auth vertical slice vardir:

- register, login, logout, `/me` ve korunan `/app` akisi;
- refresh rotation ve refresh-token reuse detection;
- HTTP-only, Secure, SameSite cookie policy;
- auth rate limiting ve redacted auth audit logging;
- register, login, forgot-password ve reset-password ekranlari;
- remember-me ve confirm-password UX.

Sprint 02 henuz tamamlanmis sayilmaz. PostgreSQL integration testleri,
browser E2E coverage ve delivery kanitlari eksiktir.

## In Scope

- email/password parent registration and login;
- Argon2id password hashing;
- short-lived access token and hashed rotating refresh token;
- refresh reuse detection and session revocation;
- HTTP-only, Secure, SameSite cookie policy;
- logout, current-user (`/me`) and session management;
- auth rate limiting and security audit events;
- auth web screens and protected application boundary;
- dar kapsamli identity migration/repository.

## Out of Scope

- child profile CRUD;
- social login, MFA and passwordless authentication;
- support/admin management UI;
- full domain database schema;
- NPC, world, story and AI features.

## Tasks

| Task ID | Deliverable | Target Boundary | Required Tests |
| --- | --- | --- | --- |
| S02-T01 | Identity/session domain and ports | `packages/auth` | unit |
| S02-T02 | Parent identity migrations and repository | `packages/database`, migrations | PostgreSQL integration |
| S02-T03 | Register/login/refresh/logout/me APIs | `apps/web/app/api` | contract + integration |
| S02-T04 | Login/register/protected layouts | `apps/web` | component + E2E |
| S02-T05 | Rate limit, redaction and auth audit | auth/config/logging | security |
| S02-T06 | Auth runbook and traceability | `docs/` | documentation review |

## Functional and Technical Requirements

- Email canonicalization and uniqueness server-side uygulanir.
- Parola hicbir zaman duz metin saklanmaz veya loglanmaz.
- Refresh token yalnizca hash olarak tutulur; rotation eski tokeni gecersiz kilar.
- Reuse tespiti token ailesini ve ilgili session'lari revoke eder.
- Authorization kontrolu UI gorunurlugune birakilamaz.
- Route handler application service cagirir; dogrudan ORM kullanmaz.
- Development auth shortcut production'da etkinlesemez.

## Acceptance Criteria

- Parent register/login/logout/me akisi gercek PostgreSQL ile calisir.
- Yanlis credential ayni genel hata zarfinda dondurur.
- Refresh rotation ve reuse detection otomatik testle kanitlanir.
- Cookie guvenlik bayraklari ortam politikasina uygundur.
- Revoke edilen session korunan endpoint'e erisemez.
- Rate limit ve audit kayitlari secret/credential icermez.
- Yetkisiz kullanici korunan route ve API'den reddedilir.

## Quality Gate and Rollback

Unit, API contract, PostgreSQL integration, browser auth flow ve security
testleri zorunludur. Migration rollback veri kaybi yaratiyorsa forward-fix
uygulanir; auth deployment bagimsiz olarak devre disi birakilabilir. Completion
report tum Task ID ve acceptance kanitlarini icerir.

## Coding Agent Mission

Yalnizca ebeveyn authentication foundation'ini uygula. Child profile veya baska
domain ozelliklerine gecme; gerekli ama eksik urun kararini varsayma.
