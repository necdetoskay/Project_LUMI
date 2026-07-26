# LUMI — Simulation + Memory Domain Package

Bu paket, Project LUMI'nin arka plan dünya simülasyonu, zaman ilerlemesi, olay üretimi, state değişimleri ve kalıcı hafıza veri katmanını kurar.

## Kapsam

### Simulation

- simulation_runs
- simulation_checkpoints
- simulation_events
- state_changes
- background_actions
- entity_time_profiles
- simulation_policies

### Memory

- memories
- memory_subjects
- memory_links
- memory_summaries
- memory_relevance
- memory_embeddings

## Temel kurallar

- Dünya simülasyonu en fazla son 10 günlük pencereyi işler.
- Yoğunluk zamanla azalır.
- 10 günden eski süre için dünya otomatik ilerletilmez.
- Her entity aynı yoğunlukta simüle edilmez.
- Yaralı, hedef taşıyan veya kritik durumda olan entity daha yüksek öncelik alabilir.
- Simulation event ve memory kayıtları append-only tutulur.
- Memory relevance bağlama göre hesaplanır.
- Embedding kaydı opsiyoneldir ve asıl hafıza kaydının yerine geçmez.

## Ön koşullar

- Database Foundation
- Identity + Profile
- World + Media
- Character + Inventory
- Story + Education

## Sonraki paket

Paket 7 — AI + Audit + System Domain
