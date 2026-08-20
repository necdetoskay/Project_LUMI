import {
  assembleGenerationContext,
  toPromptGenerationContext,
  type AssembledGenerationContext,
} from "./generation-context-assembler";
import type {
  GenerationCanonicalContext,
  GenerationContext,
} from "./generation-context.service";

export interface FirstStoryGenesisHandoffProjection {
  commit: {
    genesisPackageId: string;
    version: number;
    status: "committed";
  };
  characterState: unknown;
  worldState: unknown;
  relevantMemories: unknown;
}

export interface FirstStoryGenesisHandoffResult {
  context: GenerationContext;
  assembled: AssembledGenerationContext;
  promptContext: Record<string, unknown>;
  fingerprint: string;
}

/**
 * Bridges a domain-owned committed Genesis projection into the existing #203
 * Context Assembly engine. This service intentionally owns no Genesis schema,
 * retrieval engine or prompt budget policy of its own.
 */
export function createFirstStoryGenerationContext(
  base: GenerationContext,
  projection: FirstStoryGenesisHandoffProjection,
): GenerationContext {
  if (projection.commit.status !== "committed") {
    throw new Error("FIRST_STORY_GENESIS_HANDOFF_REQUIRES_COMMITTED_PACKAGE");
  }
  if (base.profile !== "story_generation") {
    throw new Error("FIRST_STORY_GENESIS_HANDOFF_REQUIRES_STORY_PROFILE");
  }

  const canonical: GenerationCanonicalContext = {
    characterState: structuredClone(projection.characterState),
    worldState: structuredClone(projection.worldState),
    relevantMemories: structuredClone(projection.relevantMemories),
    sourceRevision: `genesis:${projection.commit.version}`,
  };

  return {
    ...structuredClone(base),
    canonical,
  };
}

export function assembleFirstStoryGenesisHandoff(
  base: GenerationContext,
  projection: FirstStoryGenesisHandoffProjection,
): FirstStoryGenesisHandoffResult {
  const context = createFirstStoryGenerationContext(base, projection);
  const assembled = assembleGenerationContext(context);
  const promptContext = toPromptGenerationContext(assembled);
  return {
    context,
    assembled,
    promptContext,
    fingerprint: assembled.fingerprint,
  };
}
