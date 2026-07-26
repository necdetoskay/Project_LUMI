# LUMI — Story + Education Domain Package

Bu paket, Project LUMI'nin hikâye üretimi, versiyonlama, oturum, seçim, sonuç ve eğitim/reflection veri katmanını kurar.

## Kapsam

### Story

- stories
- story_versions
- story_sessions
- story_participants
- session_decisions
- story_outcomes
- story_nodes
- story_choices
- story_events

### Education

- questions
- answers
- reflections
- learning_observations

## Temel kurallar

- Story, world'e bağlıdır.
- Story version immutable kabul edilir.
- Session, belirli bir story version üzerinden başlar.
- Katılımcılar snapshot mantığıyla oturuma bağlanır.
- Seçimler append-only tutulur.
- Story outcome oturum başına tek kayıttır.
- Eğitim soruları story version veya session'a bağlanabilir.
- Çocuk cevapları ve reflection kayıtları append-only tutulur.

## Ön koşullar

- Database Foundation
- Identity + Profile
- World + Media
- Character + Inventory

## Sonraki paket

Paket 6 — Simulation + Memory Domain
