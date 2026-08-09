import { getCharacterContinuitySnapshot } from "@lumi/profiles/application";
import type {
  CanonicalMemoryPort,
  NpcBeliefSourcePort,
} from "@lumi/npc-intelligence/ports";
import {
  getLatestChoiceWorldContinuityFacts,
  type ResolveStoryContinuityContextInput,
  type StoryContinuityContext,
  type StoryContinuityContextPort,
} from "@lumi/story/application";
import {
  DrizzleBeliefSourceRepository,
  DrizzleCanonicalMemoryRepository,
} from "@lumi/npc-intelligence/db";

const MAX_BELIEF_FACTS_PER_NPC = 12;
const MAX_CHARACTER_MEMORY_FACTS = 12;
const MAX_NPC_MEMORY_FACTS = 8;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isCanonicalMemoryOwnerId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/**
 * Web composition-root adapter that turns persisted character state, committed
 * choice/world consequences, bounded canonical memories and NPC beliefs into
 * prompt-safe story continuity facts. Every read stays inside the exact
 * household/world/owner/profile scope.
 *
 * Legacy story fixtures can still identify characters/NPCs with semantic names
 * such as "Arin". Canonical memory persistence is UUID-scoped, so memory reads
 * are attempted only for canonical UUID owner identities; legacy continuity
 * evidence continues through the existing character/belief paths unchanged.
 */
export class NpcBeliefStoryContinuityContextAdapter
  implements StoryContinuityContextPort
{
  constructor(
    private readonly beliefs: NpcBeliefSourcePort = new DrizzleBeliefSourceRepository(),
    private readonly memories: CanonicalMemoryPort = new DrizzleCanonicalMemoryRepository(),
  ) {}

  async resolveContext(
    input: ResolveStoryContinuityContextInput,
  ): Promise<StoryContinuityContext> {
    const facts: StoryContinuityContext["facts"] = [];
    const now = new Date();

    if (input.childProfileId && input.characterId) {
      const character = await getCharacterContinuitySnapshot(
        input.householdId,
        input.childProfileId,
        input.characterId,
      );

      if (character) {
        facts.push({
          key: `character:${character.characterId}:identity`,
          summary: `Aktif karakter ${character.name}; kalıcı karakter sürümü ${character.version}.`,
          source: "character_profile",
        });

        if (character.traits.length > 0) {
          facts.push({
            key: `character:${character.characterId}:traits`,
            summary: `Kalıcı karakter özellikleri: ${character.traits
              .map((trait) => `${trait.dimension}=${trait.value.toFixed(2)}`)
              .join(", ")}.`,
            source: "character_traits",
          });
        }

        if (character.relationships.length > 0) {
          facts.push({
            key: `character:${character.characterId}:relationships`,
            summary: `Kalıcı ilişkiler: ${character.relationships
              .map(
                (relationship) =>
                  `${relationship.targetCharacterId}(${relationship.relationshipType}; trust=${relationship.trust.toFixed(2)}, affinity=${relationship.affinity.toFixed(2)}, familiarity=${relationship.familiarity.toFixed(2)})`,
              )
              .join("; ")}.`,
            source: "character_relationships",
          });
        }

        if (character.inventory.length > 0) {
          facts.push({
            key: `character:${character.characterId}:inventory`,
            summary: `Hikâyede kullanılabilir kalıcı envanter: ${character.inventory
              .map((item) => `${item.displayName} x${item.quantity}`)
              .join(", ")}.`,
            source: "character_inventory",
          });
        }
      }

      const characterMemoryOwnerId =
        character?.characterId ?? input.characterId;
      if (isCanonicalMemoryOwnerId(characterMemoryOwnerId)) {
        const characterMemories = await this.memories.listRelevant({
          householdId: input.householdId,
          worldId: input.worldId,
          childProfileId: input.childProfileId,
          ownerType: "character",
          ownerId: characterMemoryOwnerId,
          now,
          limit: MAX_CHARACTER_MEMORY_FACTS,
        });

        for (const memory of characterMemories) {
          facts.push({
            key: `memory:character:${memory.id}`,
            summary: memory.summary,
            source: "canonical_memory",
          });
        }
      }
    }

    facts.push(
      ...(await getLatestChoiceWorldContinuityFacts(
        input.householdId,
        input.worldId,
      )),
    );

    const npcIds = [...new Set(input.npcIds ?? [])].filter(Boolean);

    for (const npcId of npcIds) {
      const npcMemoryPromise = isCanonicalMemoryOwnerId(npcId)
        ? this.memories.listRelevant({
            householdId: input.householdId,
            worldId: input.worldId,
            childProfileId: input.childProfileId ?? null,
            ownerType: "npc",
            ownerId: npcId,
            now,
            limit: MAX_NPC_MEMORY_FACTS,
          })
        : Promise.resolve([]);

      const [beliefs, npcMemories] = await Promise.all([
        this.beliefs.getBeliefs(npcId, input.householdId, input.worldId),
        npcMemoryPromise,
      ]);

      for (const belief of beliefs
        .filter(
          (belief) =>
            belief.status === "active" &&
            (!belief.expiresAt || belief.expiresAt > now),
        )
        .slice(0, MAX_BELIEF_FACTS_PER_NPC)) {
        facts.push({
          key: `${npcId}:${belief.factId}`,
          summary: `NPC ${npcId} şu bilgiyi biliyor: ${belief.claim}`,
          source:
            belief.source === "hearsay" && belief.provenance.length > 0
              ? `hearsay:${belief.provenance.join(",")}`
              : belief.source,
        });
      }

      for (const memory of npcMemories) {
        facts.push({
          key: `memory:npc:${memory.id}`,
          summary: memory.summary,
          source: "canonical_memory",
        });
      }
    }

    return { facts };
  }
}
