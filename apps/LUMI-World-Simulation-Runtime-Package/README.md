# LUMI — World Simulation Runtime + Background Life Worker

Bu paket, Project LUMI'nin yaşayan dünya simülasyonunu çalıştıran runtime ve worker altyapısını kurar.

## Kapsam

- Simulation scheduler
- Catch-up coordinator
- 10-day freeze enforcement
- Time decay intensity
- Entity relevance selection
- NPC background intent evaluation
- Routine execution
- Ecology hooks
- Settlement/culture/politics hooks
- Simulation checkpointing
- State change persistence
- Memory creation
- Outbox integration
- Worker observability
- Integration tests

## Ana akış

```text
World Due?
→ Calculate Catch-up Window
→ Apply 10-Day Limit
→ Calculate Decay Intensity
→ Select Relevant Entities
→ Evaluate NPC Intents
→ Execute Background Actions
→ Run Domain Hooks
→ Persist State Changes
→ Create Memories
→ Write Checkpoint
→ Publish Simulation Events
```

## Tasarım ilkesi

Dünya yaşar; ancak kullanıcı uzun süre dönmediyse simülasyon sınırsız hesaplanmaz.

- İlk günler daha yoğun
- Zaman ilerledikçe azalan simülasyon yoğunluğu
- 10 günden sonra evren freeze
- Kullanıcı döndüğünde açıklanabilir özet

## Sonraki aşama

Memory Relevance + Context Retrieval Runtime
