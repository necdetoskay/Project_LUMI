import type { ContextItem, ContextSourceResult } from "./context-types";

export interface ContextRequest {
  householdId: string;
  childProfileId: string;
  worldId: string;
  storySessionId?: string | undefined;
  generationIntent: string;
  sceneFocus?: string | undefined;
  focalCharacterId?: string | undefined;
  snapshot?: Record<string, unknown> | undefined;
}

export interface SafetyPolicyItem {
  contentBoundary: "strict" | "moderate" | "open";
  requireParentApprovalForAi: boolean;
  forbiddenThemes: string[];
  ageGuidance: string[];
  rules: string[];
}

export interface ParentPolicyItem {
  householdId: string;
  maxDailyStories: number;
  contentBoundary: "strict" | "moderate" | "open";
  requireParentApprovalForAi: boolean;
  allowImageGeneration: boolean;
  allowTts: boolean;
  timeLimitMinutes: number | null;
  forbiddenThemes: string[];
}

export interface WorkingStoryCharacterContext {
  characterId: string;
  currentState: string[];
  activeGoal: string;
  relevantMemories: string[];
  relationshipNotes: string[];
  beliefNotes: string[];
  behaviorGuidance: string[];
}

export interface WorkingStoryItem {
  mode: string;
  sceneGoal: string;
  worldFacts: string[];
  activeCharacterContexts: WorkingStoryCharacterContext[];
  playerKnownFacts: string[];
  hiddenFacts: string[];
  pendingEvents: string[];
  fixedDecisions: string[];
  mustInclude: string[];
  mustNotInclude: string[];
  tone: string;
  ageGuidance: string[];
  choiceOptions?: string[];
}

export interface EmotionalStateItem {
  characterId: string;
  dominantEmotions: string[];
  behaviorGuidance: string[];
  arousal: "low" | "medium" | "high";
}

export interface LongTermMemoryItem {
  memoryId: string;
  summary: string;
  charactersInvolved: string[];
  emotionalWeight: number;
}

export interface RelevantNpcItem {
  summary: string;
}

export interface KnowledgeItem {
  knownFacts: string[];
  suspectedFacts: string[];
  unknownFacts: string[];
  hiddenTruths: string[];
}

export interface WorldItem {
  worldFacts: string[];
  location: string;
  timeOfDay: string;
  weather?: string;
  activeHazards: string[];
  visibleChanges: string[];
  inaccessibleAreas: string[];
}

export interface OriginPackageItem {
  originType: string;
  dominantVectors: string[];
  startingHome?: string;
  nearbyNpcSeeds?: string[];
  firstMystery?: string;
}

export interface SafetyPolicySource {
  fetch(
    request: ContextRequest,
  ): Promise<ContextSourceResult<SafetyPolicyItem>>;
}

export interface ParentPolicySource {
  fetch(
    request: ContextRequest,
  ): Promise<ContextSourceResult<ParentPolicyItem>>;
}

export interface WorkingStorySource {
  fetch(
    request: ContextRequest,
  ): Promise<ContextSourceResult<WorkingStoryItem>>;
}

export interface EmotionalStateSource {
  fetch(
    request: ContextRequest,
  ): Promise<ContextSourceResult<EmotionalStateItem>>;
}

export interface LongTermMemorySource {
  fetch(
    request: ContextRequest,
  ): Promise<ContextSourceResult<LongTermMemoryItem>>;
}

export interface RelevantNpcSource {
  fetch(request: ContextRequest): Promise<ContextSourceResult<RelevantNpcItem>>;
}

export interface KnowledgeSource {
  fetch(request: ContextRequest): Promise<ContextSourceResult<KnowledgeItem>>;
}

export interface WorldSource {
  fetch(request: ContextRequest): Promise<ContextSourceResult<WorldItem>>;
}

export interface OriginPackageSource {
  fetch(
    request: ContextRequest,
  ): Promise<ContextSourceResult<OriginPackageItem>>;
}

export interface ContextSection {
  name: string;
  priority: number;
  items: ContextItem[];
  tokensUsed: number;
  truncated: boolean;
}

export interface TokenBudget {
  totalTokens: number;
  safetyTokens: number;
  parentPolicyTokens: number;
  workingStoryTokens: number;
  emotionalStateTokens: number;
  longTermMemoryTokens: number;
  relevantNpcTokens?: number | undefined;
  knowledgeTokens: number;
  worldTokens: number;
  originPackageTokens?: number | undefined;
}

export interface TokenUsage {
  totalTokens: number;
  allocatedTokens: number;
  usedTokens: number;
  remainingTokens: number;
}

export type ContextFindingSeverity = "info" | "warning" | "error";

export interface ContextFinding {
  code: string;
  message: string;
  severity: ContextFindingSeverity;
  section?: string;
}

export interface ContextManifest {
  request: ContextRequest;
  sections: ContextSection[];
  tokenUsage: TokenUsage;
  findings: ContextFinding[];
  contentHash: string;
}
