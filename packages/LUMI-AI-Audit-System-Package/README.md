# LUMI — AI + Audit + System Domain Package

Bu paket, Project LUMI'nin AI entegrasyon kayıtları, model/prompt registry, maliyet izleme, audit kayıtları, transactional outbox, idempotency, feature flag ve job altyapısını kurar.

## Kapsam

### AI

- providers
- models
- prompt_templates
- prompt_template_versions
- generation_requests
- generation_attempts
- token_usage
- cost_records
- safety_reviews

### Audit

- audit_logs

### System

- outbox_events
- idempotency_keys
- feature_flags
- feature_flag_overrides
- jobs
- job_attempts
- system_settings

## Temel kurallar

- AI provider ve model kayıtları reference data olarak yönetilir.
- Prompt template version kayıtları immutable kabul edilir.
- Her generation request birden fazla attempt içerebilir.
- Token ve maliyet kayıtları attempt seviyesinde tutulur.
- Audit log append-only'dir.
- Outbox event aynı transaction içinde domain değişikliğiyle birlikte yazılır.
- Idempotency key aynı scope içinde benzersizdir.
- Job attempt geçmişi append-only tutulur.
- Maliyet değerleri para birimiyle birlikte saklanır.

## Ön koşullar

- Database Foundation
- Identity + Profile
- World + Media
- Character + Inventory
- Story + Education
- Simulation + Memory

## Sonraki aşama

Data Layer Stabilization + Vertical Slice Integration
