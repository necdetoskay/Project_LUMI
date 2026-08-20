import {
  type ContextSourceResult,
  type LongTermMemoryItem,
  type LongTermMemorySource,
  type OriginPackageItem,
  type OriginPackageSource,
  type RelevantNpcItem,
  type RelevantNpcSource,
  type StoryGenerationContextRequest,
  type WorldItem,
  type WorldSource,
} from "@lumi/context";
import {
  buildCommittedGenesisStoryContextProjection,
  type CharacterGenesisPackage,
} from "@lumi/world";

import {
  createProductionStoryContextComposer,
  type StoryContextCanonicalSourceOverrides,
  type StoryContextRuntimeReaders,
} from "../story-context-runtime";

export interface ProductionFirstStoryContextInput {
  readers: StoryContextRuntimeReaders;
  candidate: CharacterGenesisPackage;
  request: StoryGenerationContextRequest;
}

/**
 * First-story handoff entry point. It consumes only a committed, validated
 * Character Genesis package and then delegates to the exact production story
 * Context Composer used by normal scene generation.
 *
 * The one-shot source overrides are deliberately ephemeral: once canonical
 * domain stores have been populated, subsequent story scenes use the normal DB
 * retrieval sources configured by createProductionStoryContextComposer().
 */
export async function buildProductionFirstStoryContext(
  input: ProductionFirstStoryContextInput,
) {
  const projection = buildCommittedGenesisStoryContextProjection(
    input.candidate,
  );
  const overrides = buildGenesisCanonicalSourceOverrides(projection);
  return createProductionStoryContextComposer(input.readers, overrides).build(
    input.request,
  );
}

export function buildGenesisCanonicalSourceOverrides(
  projection: ReturnType<typeof buildCommittedGenesisStoryContextProjection>,
): StoryContextCanonicalSourceOverrides {
  const npcNames = projection.characterState.social.npcs.map(
    (npc) => npc.displayName,
  );
  const dna = projection.characterState.dna as Record<string, number>;
  const dominantVectors = Object.entries(dna)
    .filter(([, value]) => Number.isFinite(value))
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([axis]) => axis);

  const originPackageSource: OriginPackageSource = {
    async fetch(): Promise<ContextSourceResult<OriginPackageItem>> {
      const content: OriginPackageItem = {
        originType: "committed_genesis",
        dominantVectors,
        ...(projection.characterState.origin.summary
          ? { startingHome: projection.characterState.origin.summary }
          : {}),
        ...(npcNames.length > 0
          ? { nearbyNpcSeeds: npcNames.slice(0, 6) }
          : {}),
        ...(projection.relevantMemories.storyHooks[0]?.summary
          ? {
              firstMystery: projection.relevantMemories.storyHooks[0].summary,
            }
          : {}),
      };
      return {
        sourceRelevance: 1,
        items: [
          {
            id: "genesis:first-story:origin",
            type: "committed-genesis-origin",
            content,
            text: [
              `Origin: ${content.startingHome ?? "established canonical origin"}`,
              `Dominant vectors: ${dominantVectors.join(", ")}`,
              content.nearbyNpcSeeds?.length
                ? `Known nearby characters: ${content.nearbyNpcSeeds.join(", ")}`
                : null,
              content.firstMystery
                ? `First unresolved hook: ${content.firstMystery}`
                : null,
            ]
              .filter((value): value is string => Boolean(value))
              .join("\n"),
            sourceEngine: "character-genesis",
            authority: 1,
            confidence: 1,
            scope: "character_belief",
            priority: 1,
            relevance: 1,
          },
        ],
      };
    },
  };

  const longTermMemorySource: LongTermMemorySource = {
    async fetch(): Promise<ContextSourceResult<LongTermMemoryItem>> {
      const fragments = [
        ...projection.relevantMemories.memories.map((memory) => ({
          summary: memory.summary,
          weight: 0.7,
          type: "genesis-memory",
        })),
        ...projection.relevantMemories.threads.map((thread) => ({
          summary: thread.summary,
          weight: thread.potential,
          type: "genesis-thread",
        })),
        ...projection.relevantMemories.storyHooks.map((hook) => ({
          summary: hook.summary,
          weight: hook.potential,
          type: "genesis-story-hook",
        })),
      ];

      return {
        sourceRelevance: fragments.length > 0 ? 1 : 0,
        items: fragments.map((fragment, index) => {
          const content: LongTermMemoryItem = {
            memoryId: `genesis-bootstrap-${index + 1}`,
            summary: fragment.summary,
            charactersInvolved: npcNames,
            emotionalWeight: fragment.weight,
          };
          return {
            id: `genesis:first-story:memory:${index + 1}`,
            type: fragment.type,
            content,
            text: fragment.summary,
            sourceEngine: "character-genesis",
            authority: 1,
            confidence: 1,
            scope: "character_belief" as const,
            priority: 1 as const,
            relevance: Math.max(0, Math.min(1, fragment.weight)),
          };
        }),
      };
    },
  };

  const relevantNpcSource: RelevantNpcSource = {
    async fetch(): Promise<ContextSourceResult<RelevantNpcItem>> {
      return {
        sourceRelevance: npcNames.length > 0 ? 1 : 0,
        items: projection.characterState.social.npcs.map((npc, index) => {
          const content: RelevantNpcItem = {
            summary: `${npc.displayName} — ${npc.role}`,
          };
          return {
            id: `genesis:first-story:npc:${index + 1}`,
            type: "committed-genesis-npc",
            content,
            text: content.summary,
            sourceEngine: "character-genesis",
            authority: 1,
            confidence: 1,
            scope: "character_belief" as const,
            priority: 1 as const,
            relevance: 1,
          };
        }),
      };
    },
  };

  const worldSource: WorldSource = {
    async fetch(): Promise<ContextSourceResult<WorldItem>> {
      const stable = projection.worldState.stable;
      const temporal = projection.worldState.temporal;
      const ephemeral = projection.worldState.ephemeral;
      const worldFacts = [
        `Habitat: ${stable.habitat}`,
        `Climate: ${stable.climate.climateType}`,
        temporal.seasonName ? `Season: ${temporal.seasonName}` : null,
        stable.terrain.length > 0
          ? `Terrain: ${stable.terrain.join(", ")}`
          : null,
        stable.environmentalFeatures.length > 0
          ? `Environment: ${stable.environmentalFeatures.join(", ")}`
          : null,
      ].filter((value): value is string => Boolean(value));
      const content: WorldItem = {
        worldFacts,
        location: stable.habitat,
        timeOfDay: ephemeral.dayPhase ?? "unspecified",
        ...(ephemeral.weather ? { weather: ephemeral.weather } : {}),
        activeHazards: projection.worldState.exceptions.map(
          (exception) => exception.explanation,
        ),
        visibleChanges: [...ephemeral.localConditions],
        inaccessibleAreas: [],
      };
      return {
        sourceRelevance: 1,
        items: [
          {
            id: "genesis:first-story:world",
            type: "committed-genesis-world",
            content,
            text: [
              ...worldFacts,
              `Time of day: ${content.timeOfDay}`,
              content.weather ? `Weather: ${content.weather}` : null,
              content.visibleChanges.length > 0
                ? `Local conditions: ${content.visibleChanges.join(", ")}`
                : null,
            ]
              .filter((value): value is string => Boolean(value))
              .join("\n"),
            sourceEngine: "character-genesis",
            authority: 1,
            confidence: 1,
            scope: "world_truth",
            priority: 1,
            relevance: 1,
          },
        ],
      };
    },
  };

  return {
    originPackageSource,
    longTermMemorySource,
    relevantNpcSource,
    worldSource,
  };
}
