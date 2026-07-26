# Domain Event Catalog

## Event Adlandırma
Format: `<Aggregate><PastTenseAction>`

Örnekler:
- `StorySessionStarted`
- `StoryChoiceSelected`
- `StoryGenerationRequested`
- `StoryGenerationCompleted`
- `StoryGenerationFailed`
- `NpcIntentCreated`
- `NpcInteractionTriggered`
- `WorldTimeAdvanced`
- `WorldEventOccurred`
- `InventoryItemGranted`
- `CharacterStateChanged`
- `ParentApprovalRequired`
- `SafetyReviewFailed`

## Event Sınıfları

### Story
- StorySessionStarted
- StoryNodeEntered
- StoryChoicePresented
- StoryChoiceSelected
- StoryCompleted

### AI Orchestration
- GenerationRequested
- GenerationStarted
- GenerationCompleted
- GenerationFailed
- ProviderFallbackActivated

### World Simulation
- WorldTimeAdvanced
- RegionStateChanged
- RareWorldEventCreated
- BackgroundSimulationPaused

### NPC
- NpcIntentCreated
- NpcRoutineChanged
- NpcEmergentInteractionTriggered
- NpcRelationshipChanged

### Inventory
- InventoryItemAdded
- InventoryItemConsumed
- InventoryItemTransferred

## Event Sahipliği
Her event tek bir bounded context tarafından üretilir. Başka modüller event'i tüketebilir fakat anlamını yeniden tanımlayamaz.
