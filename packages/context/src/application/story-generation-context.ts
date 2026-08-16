import { ContextBuilder, type ContextBuilderDeps } from "./context-builder";
import type { ContextManifest, ContextRequest, TokenBudget } from "../ports";

/**
 * Canonical prompt-context budget for story generation.
 *
 * Story generation deliberately gets a fixed budget so callers cannot
 * accidentally bypass the context policy by constructing ad-hoc manifests.
 */
export const STORY_GENERATION_CONTEXT_TOKENS = 5_200;

export const STORY_GENERATION_TOKEN_BUDGET: Readonly<TokenBudget> = {
  totalTokens: STORY_GENERATION_CONTEXT_TOKENS,
  safetyTokens: 780,
  parentPolicyTokens: 390,
  workingStoryTokens: 1_430,
  emotionalStateTokens: 520,
  longTermMemoryTokens: 650,
  relevantNpcTokens: 390,
  knowledgeTokens: 0,
  worldTokens: 650,
  originPackageTokens: 390,
};

export interface StoryGenerationContextRequest
  extends Omit<ContextRequest, "generationIntent"> {
  generationIntent?: string;
}

/**
 * Composes the authoritative, budgeted context consumed by story generation.
 * Source ownership remains behind ContextBuilderDeps; this layer only fixes
 * the story-specific intent and budget policy.
 */
export class StoryGenerationContextComposer {
  private readonly builder: ContextBuilder;

  constructor(deps: ContextBuilderDeps) {
    this.builder = new ContextBuilder(deps, {
      ...STORY_GENERATION_TOKEN_BUDGET,
    });
  }

  build(request: StoryGenerationContextRequest): Promise<ContextManifest> {
    return this.builder.build({
      ...request,
      generationIntent: request.generationIntent ?? "story_generation",
    });
  }
}

export function createStoryGenerationContextComposer(
  deps: ContextBuilderDeps,
): StoryGenerationContextComposer {
  return new StoryGenerationContextComposer(deps);
}
