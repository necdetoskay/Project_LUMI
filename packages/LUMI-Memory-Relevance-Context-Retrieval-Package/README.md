# LUMI — Memory Relevance + Context Retrieval Runtime

Bu paket, Project LUMI'nin kalıcı hafıza işleme ve bağlam getirme runtime'ını kurar.

## Kapsam

- Memory ingestion pipeline
- Memory subject graph
- Relevance scoring
- Recency decay
- Emotional salience
- Story consequence weighting
- Memory summarization
- Embedding adapter
- Hybrid retrieval
- Context budgeter
- Duplicate memory detection
- Retrieval audit
- Privacy filtering
- Integration tests

## Ana akış

```text
Event / Story / NPC Action
→ Normalize Memory Candidate
→ Privacy Filter
→ Duplicate Detection
→ Importance & Salience Scoring
→ Persist Memory
→ Link Subjects
→ Optional Embedding
→ Retrieval Request
→ Hybrid Search
→ Relevance Re-ranking
→ Context Budgeting
→ Retrieval Audit
```

## Tasarım ilkesi

LUMI tüm geçmişi prompt'a taşımaz.

Yalnızca:

- ilgili,
- yeterince güncel,
- duygusal veya sonuçsal açıdan önemli,
- ilgili karakter ya da dünya varlıklarına bağlı

hafızalar seçilir.

## Sonraki aşama

NPC Emergent Interaction Engine
