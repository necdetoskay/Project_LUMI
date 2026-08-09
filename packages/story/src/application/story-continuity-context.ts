export interface StoryContinuityFact {
  key: string;
  summary: string;
  source?: string | null;
}

export interface StoryContinuityContext {
  /** Human-readable, prompt-safe continuity facts in priority order. */
  facts: StoryContinuityFact[];
}

export interface ResolveStoryContinuityContextInput {
  householdId: string;
  worldId: string;
  childProfileId?: string | null;
  characterId?: string | null;
  /** Relevant NPCs for this generation request; adapters must not widen scope. */
  npcIds?: string[];
}

/**
 * Package-safe boundary for loading bounded continuity state before story
 * generation. The concrete adapter may read world/NPC/profile persistence, but
 * @lumi/story only receives prompt-safe summaries through this contract.
 */
export interface StoryContinuityContextPort {
  resolveContext(
    input: ResolveStoryContinuityContextInput,
  ): Promise<StoryContinuityContext>;
}

export const STORY_CONTINUITY_MAX_FACTS = 12;
export const STORY_CONTINUITY_FACT_MAX = 320;

export function normalizeStoryContinuityContext(
  context: StoryContinuityContext | null | undefined,
): StoryContinuityContext {
  if (!context) return { facts: [] };
  return {
    facts: context.facts
      .slice(0, STORY_CONTINUITY_MAX_FACTS)
      .map((fact) => ({
        key: fact.key.slice(0, 120),
        summary: fact.summary.slice(0, STORY_CONTINUITY_FACT_MAX),
        source: fact.source?.slice(0, 160) ?? null,
      }))
      .filter((fact) => fact.key.length > 0 && fact.summary.length > 0),
  };
}
