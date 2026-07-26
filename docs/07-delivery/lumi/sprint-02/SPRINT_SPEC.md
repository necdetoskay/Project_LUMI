# Sprint 02 — Authentication and Parent Account

**Sprint ID:** LUMI-S02  
**Version:** 1.0.0  
**Status:** Planned / Agent-ready  
**Depends On:** Sprint 01 exit gate  
**Standard:** [Agent-Ready Sprint Standard](../sprint-master-plan/AGENT_READY_SPRINT_STANDARD.md)

## Goal

Ebeveyn hesabı için güvenli registration, login, session, logout ve temel
authorization altyapısını üretmek.

## In Scope

- email/password parent registration and login;
- Argon2id password hashing;
- short-lived access token and hashed rotating refresh token;
- refresh reuse detection and session revocation;
- HTTP-only, Secure, SameSite cookie policy;
- logout, current-user (`/me`) and session management;
- auth rate limiting and security audit events;
- auth web screens and protected application boundary;
- dar kapsamlı identity migration/repository.

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

- Email canonicalization and uniqueness server-side uygulanır.
- Parola hiçbir zaman düz metin saklanmaz veya loglanmaz.
- Refresh token yalnızca hash olarak tutulur; rotation eski tokenı geçersiz
  kılar.
- Reuse tespiti token ailesini ve ilgili session'ları revoke eder.
- Authorization kontrolü UI görünürlüğüne bırakılamaz.
- Route handler application service çağırır; doğrudan ORM kullanmaz.
- Development auth shortcut production'da etkinleşemez.

## Acceptance Criteria

- Parent register/login/logout/me akışı gerçek PostgreSQL ile çalışır.
- Yanlış credential aynı genel hata zarfını döndürür.
- Refresh rotation ve reuse detection otomatik testle kanıtlanır.
- Cookie güvenlik bayrakları ortam politikasına uygundur.
- Revoke edilen session korunan endpoint'e erişemez.
- Rate limit ve audit kayıtları secret/credential içermez.
- Yetkisiz kullanıcı korunan route ve API'den reddedilir.

## Quality Gate and Rollback

Unit, API contract, PostgreSQL integration, browser auth flow ve security
testleri zorunludur. Migration rollback veri kaybı yaratıyorsa forward-fix
uygulanır; auth deployment bağımsız olarak devre dışı bırakılabilir. Completion
report tüm Task ID ve acceptance kanıtlarını içerir.

## Coding Agent Mission

Yalnızca ebeveyn authentication foundation'ı uygula. Child profile veya başka
domain özelliklerine geçme; gerekli ama eksik ürün kararını varsayma.

