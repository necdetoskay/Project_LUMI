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

export type GenerationContextCacheStatus =
  | "hit"
  | "miss"
  | "bypass"
  | "unknown";

/**
 * Optional operational telemetry emitted by a source. It is intentionally
 * separate from source provenance and therefore must not participate in the
 * deterministic provider-context fingerprint.
 */
export interface GenerationContextSourceTelemetry {
  relevance?: number;
  cacheStatus?: GenerationContextCacheStatus;
}

/**
 * Privacy-safe address for an immutable historical source projection.
 *
 * `snapshotDigest` is content-addressed rather than a domain/source identifier,
 * so it can be persisted in generation trace provenance without exposing child,
 * household, cycle or other internal IDs. A source may advertise this reference
 * only when it also implements `replay()` against the named immutable store.
 */
export interface GenerationContextSourceReplayReference {
  kind: "content_addressed_snapshot";
  store: string;
  snapshotDigest: string;
  snapshotVersion: string;
}

export interface GenerationContextSourceResult {
  value: unknown;
  sourceId?: string;
  revision?: string;
  updatedAt?: string;
  replayReference?: GenerationContextSourceReplayReference;
  telemetry?: GenerationContextSourceTelemetry;
}

export interface GenerationContextSource {
  readonly section: GenerationContextSection;
  readonly source: string;
  readonly sourceVersion: string;
  readonly authority: GenerationContextSourceAuthority;
  readonly reason: GenerationContextSourceReason;
  resolve(context: GenerationContext): GenerationContextSourceResult;
  /**
   * Reloads the exact historical section value addressed by an immutable replay
   * reference. Mutable/current-state readers must leave this undefined.
   */
  replay?(reference: GenerationContextSourceReplayReference): unknown;
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

function canonicalProjection(
  context: GenerationContext,
  key: "characterState" | "worldState" | "relevantMemories",
): GenerationContextSourceResult {
  const value = context.canonical?.[key] ?? null;
  return {
    value,
    ...(context.canonical?.sourceRevision
      ? { revision: context.canonical.sourceRevision }
      : {}),
  };
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
  source(
    "character_state",
    "genesis.committed-character-state",
    "canonical",
    (context) => canonicalProjection(context, "characterState"),
  ),
  source(
    "world_state",
    "genesis.committed-world-state",
    "canonical",
    (context) => canonicalProjection(context, "worldState"),
  ),
  source("recent_story_state", "story.recent-state", "recent", () => ({
    value: null,
  })),
  {
    section: "relevant_memories",
    source: "genesis.relevant-memory-thread-fragments",
    sourceVersion: "v1",
    authority: "retrieved",
    reason: "retrieved",
    resolve: (context) => canonicalProjection(context, "relevantMemories"),
  },
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

export function replayGenerationContextSource(
  source: GenerationContextSource,
  reference: GenerationContextSourceReplayReference,
): unknown {
  if (!source.replay) {
    throw new Error(
      `GENERATION_CONTEXT_SOURCE_NOT_REPLAYABLE:${source.section}`,
    );
  }
  return source.replay(reference);
}
