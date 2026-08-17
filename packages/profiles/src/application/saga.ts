export const SAGA_SAFE_PROJECTION_VERSION = 1;

export {
  SAGA_FOUNDATION_SCHEMA_VERSION,
  buildSagaFoundation,
  validateTruthKnowledgeBeliefInvariant,
  validateRevealPolicy,
  projectSagaForStoryContext,
  assertSagaMutationAuthority,
} from "./saga-foundation.service";
export type {
  CoreTension,
  SagaTimeScales,
  SagaFoundationContext,
  SagaFoundationDraft,
  SagaFoundationResult,
  SagaFoundationGenerationRequest,
  SagaFoundationGenerationPort,
  SagaFoundationDeps,
  SagaSafeContextProjection,
} from "./saga-foundation.service";

export {
  SAGA_PROGRESSION_EVENT_TYPE,
  applySagaProgressionMutation,
  projectFoundationSagaForStory,
  commitSagaProgressionFromStory,
} from "./saga-progression.service";
export type {
  SagaProgressionMutation,
  StoryLocalConsequence,
  SagaAwareStoryCommit,
  SagaProgressionAuditPayload,
  CommitSagaProgressionInput,
  CommitSagaProgressionResult,
} from "./saga-progression.service";
