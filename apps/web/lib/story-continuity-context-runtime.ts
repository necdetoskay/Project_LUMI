import { getCharacterContinuitySnapshot } from "@lumi/profiles/application";
import type {
  ResolveStoryContinuityContextInput,
  StoryContinuityContext,
  StoryContinuityContextPort,
} from "@lumi/story/application";
import { DrizzleBeliefSourceRepository } from "@lumi/npc-intelligence/db";

/**
 * Web composition-root adapter that turns persisted character state and NPC
 * beliefs into bounded, prompt-safe story continuity facts. Character reads
 * require the exact household + child + character scope; NPC reads remain
 * household + world + explicit-NPC scoped.
 */
export class NpcBeliefStoryContinuityContextAdapter
  implements StoryContinuityContextPort
{
  constructor(private readonly beliefs = new DrizzleBeliefSourceRepository()) {}

  async resolveContext(
    input: ResolveStoryContinuityContextInput,
  ): Promise<StoryContinuityContext> {
    const facts: StoryContinuityContext["facts"] = [];

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
    }

    const npcIds = [...new Set(input.npcIds ?? [])].filter(Boolean);
    const now = new Date();

    for (const npcId of npcIds) {
      const beliefs = await this.beliefs.getBeliefs(
        npcId,
        input.householdId,
        input.worldId,
      );
      for (const belief of beliefs) {
        if (belief.status !== "active") continue;
        if (belief.expiresAt && belief.expiresAt <= now) continue;
        facts.push({
          key: `${npcId}:${belief.factId}`,
          summary: `NPC ${npcId} şu bilgiyi biliyor: ${belief.claim}`,
          source:
            belief.source === "hearsay" && belief.provenance.length > 0
              ? `hearsay:${belief.provenance.join(",")}`
              : belief.source,
        });
      }
    }

    return { facts };
  }
}
