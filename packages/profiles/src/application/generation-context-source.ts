import type { GenerationContext } from "./generation-context.service";
import type { GenerationContextSection } from "./generation-context-policy";

export type GenerationContextSourceAuthority =
  | "canonical"
  | "derived"
  | "retrieved";

export interface GenerationContextSourceResult {
  value: unknown;
}

export interface GenerationContextSource {
  readonly section: GenerationContextSection;
  readonly source: string;
  readonly authority: GenerationContextSourceAuthority;
  resolve(context: GenerationContext): GenerationContextSourceResult;
}

function source(
  section: GenerationContextSection,
  sourceName: string,
  resolve: (context: GenerationContext) => unknown,
): GenerationContextSource {
  return {
    section,
    source: sourceName,
    authority: "canonical",
    resolve(context) {
      return { value: resolve(context) };
    },
  };
}

const DEFAULT_GENERATION_CONTEXT_SOURCES: readonly GenerationContextSource[] = [
  source("child_identity", "profiles.child-profile", (context) => ({
    ageBand: context.child.ageBand,
    ageYears: context.child.ageYears,
    locale: context.child.locale,
  })),
  source(
    "child_personalization",
    "profiles.child-personalization",
    (context) => ({
      interests: context.child.interests,
      customInterests: context.child.customInterests,
      developmentGoals: context.child.developmentGoals,
    }),
  ),
  source(
    "creation_direction",
    "profiles.character-creation-cycle",
    (context) => ({
      startDirection: context.creation.startDirection,
    }),
  ),
  source(
    "creation_selections",
    "profiles.character-creation-cycle",
    (context) => context.creation.previousSelections,
  ),
  source("character_state", "profiles.character-state", () => null),
  source("world_state", "world.current-state", () => null),
  source("recent_story_state", "story.recent-state", () => null),
  source("relevant_memories", "memory.relevant", () => null),
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
