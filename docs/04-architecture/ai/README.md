# AI Architecture

Project LUMI'nin model routing, prompt orchestration, generation quality,
evaluation, safety, context assembly and cost-control mimarilerini içerir.

| Belge | Kapsam | Durum |
| --- | --- | --- |
| [Prompt Management Standard](PROMPT_MANAGEMENT_STANDARD.md) | Prompt Registry / Runtime, versioning, editable prompt governance ve güvenlik sınırları | Canonical |
| [Context Management Architecture](context-management.md) | Context policy/source/assembly, token budget, compaction, provenance, Inspector, observability ve privacy sınırları | Canonical |
| [Character Genesis & Social World](character-genesis-social-world.md) | Character Genesis, saga/DNA/social world ve first-story handoff mimarisi | Canonical |
| [LUMI AI Generation Harness](lumi-ai-generation-harness.md) | Production generation harness ve orchestration yaklaşımı | Architecture |
| [Generation Quality Evaluation](generation-quality-evaluation.md) | Origin ve story üretimlerinin özgünlük, zenginlik, tutarlılık, çocuk güvenliği ve hikaye potansiyeli kalite kapıları | Canonical |

AI mimarisi için temel kural: LLM çıktısı güvenilmeyen girdidir. Kalıcı world,
character, story veya child-facing içerik ancak schema, safety, canon ve kalite
kontrollerinden geçtikten sonra kullanılabilir.
