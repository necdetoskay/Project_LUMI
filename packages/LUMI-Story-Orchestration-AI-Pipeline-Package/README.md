# LUMI — Story Orchestration + AI Generation Pipeline

Bu paket, Project LUMI'nin hikâye üretim orkestrasyonu ve AI sağlayıcı bağımsız üretim hattını kurar.

## Kapsam

- Prompt context builder
- Story generation orchestrator
- Provider abstraction
- Model fallback chain
- Structured output schema
- Story graph validation
- Safety review
- Prompt version tracking
- Generation retry policy
- Cost reconciliation
- Story persistence
- Outbox worker
- Generation status polling
- Integration testleri

## Ana akış

```text
Generation Request
→ Load World Context
→ Load Character Context
→ Load Relevant Memories
→ Build Prompt Context
→ Resolve Prompt Version
→ Select Model
→ Generate Structured Output
→ Validate Story Schema
→ Validate Node Graph
→ Safety Review
→ Persist Story + Version + Nodes + Choices
→ Record Usage + Cost
→ Publish Completion Event
```

## Ön koşullar

- First Story Player Package
- AI + Audit + System Package
- Simulation + Memory Package
- Story + Education Package

## Sonraki aşama

World Simulation Runtime + Background Life Worker
