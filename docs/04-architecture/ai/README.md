# AI Architecture

Project LUMI'nin model routing, prompt orchestration, generation quality,
evaluation, safety, context assembly ve cost-control mimarilerini içerir.

| Belge | Kapsam | Durum |
| --- | --- | --- |
| [Context Assembly Engine](context-assembly-engine.md) | Canonical context source ownership, visibility/privacy, token budgets, compaction, retrieval, cache/retry, fingerprint/replay, Inspector ve observability sözleşmeleri | Canonical |
| [Generation Quality Evaluation](generation-quality-evaluation.md) | Origin ve story üretimlerinin özgünlük, zenginlik, tutarlılık, çocuk güvenliği ve hikaye potansiyeli kalite kapıları | Canonical |

AI mimarisi için temel kural: LLM çıktısı güvenilmeyen girdidir. Kalıcı world,
character, story veya child-facing içerik ancak schema, safety, canon ve kalite
kontrollerinden geçtikten sonra kullanılabilir.
