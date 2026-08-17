import { createHash } from "node:crypto";

import {
  ContextBuilder,
  estimateTokens,
  type ContextBuilderDeps,
} from "./context-builder";
import type {
  ContextItem,
  ContextManifest,
  ContextRequest,
  ContextSection,
  TokenBudget,
} from "../ports";

/**
 * Canonical prompt-context budget for story generation.
 *
 * Story generation deliberately gets a fixed budget so callers cannot
 * accidentally bypass the context policy by constructing ad-hoc manifests.
 * Saga receives an independent 390-token slice inside the same 5,200-token
 * ceiling; it is not allowed to crowd out safety, parent policy or world truth.
 */
export const STORY_GENERATION_CONTEXT_TOKENS = 5_200;
export const SAGA_STORY_CONTEXT_TOKENS = 390;

export const STORY_GENERATION_TOKEN_BUDGET: Readonly<TokenBudget> = {
  totalTokens: STORY_GENERATION_CONTEXT_TOKENS,
  safetyTokens: 780,
  parentPolicyTokens: 390,
  workingStoryTokens: 1_040,
  emotionalStateTokens: 520,
  longTermMemoryTokens: 650,
  relevantNpcTokens: 390,
  knowledgeTokens: 0,
  worldTokens: 650,
  originPackageTokens: 390,
};

/**
 * Provider-safe saga contract. Deliberately excludes deepTruth, hiddenForces,
 * forbiddenEarlyReveals and future reveal-layer payloads.
 */
export interface SagaStoryContext {
  centralQuestion: string;
  longTermDesire: string;
  stakes: string;
  knownFacts: string[];
  currentBeliefs: string[];
  revealedClues: string[];
  unresolvedQuestions: string[];
  revealStage: number;
}

export interface StoryGenerationContextRequest
  extends Omit<ContextRequest, "generationIntent"> {
  generationIntent?: string;
  saga?: SagaStoryContext;
}

/**
 * Composes the authoritative, budgeted context consumed by story generation.
 * Source ownership remains behind ContextBuilderDeps; this layer fixes the
 * story-specific intent/budget and appends only a reveal-safe saga projection.
 */
export class StoryGenerationContextComposer {
  private readonly builder: ContextBuilder;

  constructor(deps: ContextBuilderDeps) {
    this.builder = new ContextBuilder(deps, {
      ...STORY_GENERATION_TOKEN_BUDGET,
    });
  }

  async build(request: StoryGenerationContextRequest): Promise<ContextManifest> {
    const { saga, ...baseRequest } = request;
    const manifest = await this.builder.build({
      ...baseRequest,
      generationIntent: request.generationIntent ?? "story_generation",
    });
    return saga ? appendSagaContext(manifest, saga) : manifest;
  }
}

export function createStoryGenerationContextComposer(
  deps: ContextBuilderDeps,
): StoryGenerationContextComposer {
  return new StoryGenerationContextComposer(deps);
}

export function sagaStoryContextToItems(saga: SagaStoryContext): ContextItem[] {
  return [
    {
      id: "saga:premise",
      type: "saga-public-premise",
      content: saga,
      text: [
        `Central question: ${saga.centralQuestion}`,
        `Long-term desire: ${saga.longTermDesire}`,
        `Stakes: ${saga.stakes}`,
        `Reveal stage: ${saga.revealStage}`,
      ].join("\n"),
      sourceEngine: "saga-progression",
      authority: 0.95,
      confidence: 1,
      scope: "narrative_instruction",
      priority: 1,
      relevance: 1,
    },
    {
      id: "saga:knowledge-beliefs",
      type: "saga-current-knowledge",
      content: saga,
      text: [
        `Known facts: ${saga.knownFacts.join("; ")}`,
        `Current beliefs: ${saga.currentBeliefs.join("; ")}`,
      ].join("\n"),
      sourceEngine: "saga-progression",
      authority: 0.95,
      confidence: 1,
      scope: "character_belief",
      priority: 1,
      relevance: 1,
    },
    {
      id: "saga:reveals-questions",
      type: "saga-reveal-safe-clues",
      content: saga,
      text: [
        `Revealed clues: ${saga.revealedClues.join("; ")}`,
        `Unresolved questions: ${saga.unresolvedQuestions.join("; ")}`,
      ].join("\n"),
      sourceEngine: "saga-progression",
      authority: 0.95,
      confidence: 1,
      scope: "player_knowledge",
      priority: 1,
      relevance: 1,
    },
  ];
}

export function appendSagaContext(
  manifest: ContextManifest,
  saga: SagaStoryContext,
): ContextManifest {
  const items = sagaStoryContextToItems(saga);
  const selected: ContextItem[] = [];
  let tokensUsed = 0;
  for (const item of items) {
    const itemTokens = estimateTokens(item.text);
    if (tokensUsed + itemTokens <= SAGA_STORY_CONTEXT_TOKENS) {
      selected.push(item);
      tokensUsed += itemTokens;
    }
  }

  const section: ContextSection = {
    name: "saga",
    priority: 9,
    items: selected,
    tokensUsed,
    truncated: selected.length < items.length,
  };
  const usedTokens = manifest.tokenUsage.usedTokens + tokensUsed;
  const findings = section.truncated
    ? [
        ...manifest.findings,
        {
          code: "SECTION_TRUNCATED",
          message: "saga section truncated to fit token budget",
          severity: "warning" as const,
          section: "saga",
        },
      ]
    : manifest.findings;
  const contentHash = createHash("sha256")
    .update(
      `${manifest.contentHash}:${JSON.stringify({
        name: section.name,
        items: section.items.map((item) => ({
          id: item.id,
          text: item.text,
          scope: item.scope,
        })),
      })}`,
    )
    .digest("hex");

  return {
    ...manifest,
    sections: [...manifest.sections, section],
    findings,
    tokenUsage: {
      ...manifest.tokenUsage,
      allocatedTokens:
        manifest.tokenUsage.allocatedTokens + SAGA_STORY_CONTEXT_TOKENS,
      usedTokens,
      remainingTokens: Math.max(
        0,
        manifest.tokenUsage.totalTokens - usedTokens,
      ),
    },
    contentHash,
  };
}
