import type { GenerationContext } from "./generation-context.service";
import type { GenerationContextSection } from "./generation-context-policy";

export type GenerationContextSourceAuthority =
  | "canonical"
  | "derived"
  | "retrieved";

export type GenerationContextSourceReason =
  | "required"
  | "personalization"
  | "current_task"
  | "canonical"
  | "recent"
  | "retrieved";

export interface GenerationContextSourceResult {
  value: unknown;
  sourceId?: string;
  revision?: string;
  updatedAt?: string;
}

export interface GenerationContextSource {
  readonly section: GenerationContextSection;
  readonly source: string;
  readonly sourceVersion: string;
  readonly authority: GenerationContextSourceAuthority;
  readonly reason: GenerationContextSourceReason;
  resolve(context: GenerationContext): GenerationContextSourceResult;
}

function source(
  section: GenerationContextSection,
  sourceName: string,
  reason: GenerationContextSourceReason,
  resolve: (context: GenerationContext) => GenerationContextSourceResult,
): GenerationContextSource {
  return {
    section,
    source: sourceName,
    sourceVersion: "v1",
    authority: "canonical",
    reason,
    resolve,
  };
}

function withOptionalSourceId(
  value: unknown,
  sourceId: string | null | undefined,
): GenerationContextSourceResult {
  return sourceId ? { value, sourceId } : { value };
}

const DEFAULT_GENERATION_CONTEXT_SOURCES: readonly GenerationContextSource[] = [
  source("child_identity", "profiles.child-profile", "required", (context) => ({
    value: {
      ageBand: context.child.ageBand,
      ageYears: context.child.ageYears,
      locale: context.child.locale,
    },
    sourceId: context.child.id,
  })),
  source(
    "child_personalization",
    "profiles.child-personalization",
    "personalization",
    (context) => ({
      value: {
        interests: context.child.interests,
        customInterests: context.child.customInterests,
        developmentGoals: context.child.developmentGoals,
      },
      sourceId: context.child.id,
    }),
  ),
  source(
    "creation_direction",
    "profiles.character-creation-cycle",
    "current_task",
    (context) =>
      withOptionalSourceId(
        {
          startDirection: context.creation.startDirection,
        },
        context.creation.cycleId,
      ),
  ),
  source(
    "creation_selections",
    "profiles.character-creation-cycle",
    "current_task",
    (context) =>
      withOptionalSourceId(
        context.creation.previousSelections,
        context.creation.cycleId,
      ),
  ),
  source("character_state", "profiles.character-state", "canonical", () => ({
    value: null,
  })),
  source("world_state", "world.current-state", "canonical", () => ({
    value: null,
  })),
  source("recent_story_state", "story.recent-state", "recent", () => ({
    value: null,
  })),
  source("relevant_memories", "memory.relevant", "retrieved", () => ({
    value: null,
  })),
];

export function createGenerationContextSourceRegistry(
  sources: readonly GenerationContextSource[] = DEFAULT_GENERATION_CONTEXT_SOURCES,
): ReadonlyMap<GenerationContextSection, GenerationContextSource> {
  const registry = new Map<GenerationContextSection, GenerationContextSource>();

  for (const entry of sources) {
    if (registry.has(entry.section)) {
      throw new Error(`GENERATION_CONTEXT_SOURCE_DUPLICATE:${entry.section}`);
    }
    registry.set(entry.section, entry);
  }

  return registry;
}

export function getDefaultGenerationContextSources(): readonly GenerationContextSource[] {
  return DEFAULT_GENERATION_CONTEXT_SOURCES;
}
