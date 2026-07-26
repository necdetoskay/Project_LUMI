# LUMI — NPC Emergent Interaction Engine

Bu paket, Project LUMI'de NPC'lerin yalnızca rutin yaşayan pasif varlıklar olmak yerine proaktif şekilde hikâye fırsatları üretmesini sağlar.

## Kapsam

- Proactive NPC intent generation
- Rumor creation
- Gift and item sharing
- Warning interactions
- Invitation and quest seeds
- NPC-to-NPC information propagation
- Relationship-aware targeting
- Opportunity expiry
- Story hook generation
- Child safety filtering
- Interaction cooldowns
- Novelty control
- World news integration
- Interaction inbox
- Integration tests

## Ana akış

```text
Simulation Tick
→ Select Eligible NPCs
→ Generate Intent Candidates
→ Apply Relationship Targeting
→ Check Cooldowns
→ Check Novelty
→ Check Safety
→ Create Interaction Opportunity
→ Optionally Propagate Information
→ Publish World News
→ Deliver to Interaction Inbox
→ Convert Accepted Opportunity to Story Hook
```

## Tasarım amacı

NPC'ler:

- söylenti getirir,
- eşya verir,
- yaklaşan tehlike hakkında uyarır,
- bir yere davet eder,
- yardım ister,
- başka NPC'lerden duyduğu bilgiyi aktarır,
- hikâye tohumu oluşturur.

Böylece dünya statik görünmez ve çocuk karakterin çevresindeki kişiler kendiliğinden yaşayan bireyler gibi davranır.

## Sonraki aşama

World News + Opportunity Feed + Parent Controls
