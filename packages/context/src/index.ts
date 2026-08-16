export type {
  ContextItem,
  ContextSourceResult,
  ContextScope,
  ContextPriority,
  ContextRequest,
  SafetyPolicyItem,
  ParentPolicyItem,
  WorkingStoryItem,
  WorkingStoryCharacterContext,
  EmotionalStateItem,
  LongTermMemoryItem,
  KnowledgeItem,
  WorldItem,
  OriginPackageItem,
  SafetyPolicySource,
  ParentPolicySource,
  WorkingStorySource,
  EmotionalStateSource,
  LongTermMemorySource,
  KnowledgeSource,
  WorldSource,
  OriginPackageSource,
  ContextSection,
  TokenBudget,
  TokenUsage,
  ContextFinding,
  ContextFindingSeverity,
  ContextManifest,
} from "./ports";

export type {
  ContextBuilderDeps,
  StoryGenerationContextRequest,
  ContextInspectorItem,
  ContextInspectorProjection,
  ContextInspectorSection,
} from "./application";

export {
  ContextBuilder,
  createDefaultTokenBudget,
  estimateTokens,
  safetyPolicyToItem,
  workingStoryToItems,
  emotionalStateToItems,
  longTermMemoryToItems,
  knowledgeToItems,
  worldToItems,
  originPackageToItems,
  createContextInspectorProjection,
  STORY_GENERATION_CONTEXT_TOKENS,
  STORY_GENERATION_TOKEN_BUDGET,
  StoryGenerationContextComposer,
  createStoryGenerationContextComposer,
} from "./application";

export {
  DEFAULT_SAFETY_BASELINE,
  BOUNDARY_RANK,
  isBoundaryAtLeastAsRestrictive,
  stricterBoundary,
  getSafetyPrecedence,
  ensureParentPolicyDoesNotLoosenSafety,
} from "./policy";
export type {
  SafetyBaseline,
  SafetyContentBoundary,
  PolicyViolation,
  PolicyGuardResult,
} from "./policy";

export {
  InMemorySafetyPolicyAdapter,
  InMemoryParentPolicyAdapter,
  InMemoryWorkingStoryAdapter,
  InMemoryEmotionalStateAdapter,
  InMemoryLongTermMemoryAdapter,
  InMemoryKnowledgeAdapter,
  InMemoryWorldAdapter,
  InMemoryOriginPackageAdapter,
  CanonicalMemoryRetrievalAdapter,
  WorldEventRetrievalAdapter,
  RetrievalLongTermMemorySource,
  RetrievalWorldEventSource,
  SystemSafetyPolicySource,
  NoPersistedParentPolicySource,
  NoCanonicalKnowledgeSource,
  RequestSnapshotWorkingStorySource,
  PersistedEmotionalStateSource,
  PersistedOriginPackageSource,
} from "./adapters";
export type {
  CanonicalMemoryReader,
  CanonicalMemoryRecord,
  WorldEventReader,
  WorldEventRecord,
  WorkingStorySnapshotReader,
  EmotionalStateSnapshotReader,
  AcceptedOriginPackageReader,
  AcceptedOriginPackageRecord,
} from "./adapters";

export { CanonicalNpcRetrievalAdapter } from "./adapters/canonical-npc-retrieval.adapter";
export type {
  CanonicalNpcContextPayload,
  CanonicalNpcIdentityReader,
  CanonicalNpcIdentityRecord,
  CanonicalNpcRuntimeReader,
  CanonicalNpcRuntimeRecord,
} from "./adapters/canonical-npc-retrieval.adapter";
