import type {
  ResolveStoryContinuityContextInput,
  StoryContinuityContext,
  StoryContinuityContextPort,
} from "@lumi/story/application";
import { DrizzleBeliefSourceRepository } from "@lumi/npc-intelligence/db";

/**
 * Web composition-root adapter that turns persisted NPC beliefs into bounded,
 * prompt-safe story continuity facts. Reads are always household + world + NPC
 * scoped; callers must provide explicit npcIds.
 */
export class NpcBeliefStoryContinuityContextAdapter
  implements StoryContinuityContextPort
{
  constructor(
    private readonly beliefs = new DrizzleBeliefSourceRepository(),
  ) {}

  async resolveContext(
    input: ResolveStoryContinuityContextInput,
  ): Promise<StoryContinuityContext> {
    const npcIds = [...new Set(input.npcIds ?? [])].filter(Boolean);
    if (npcIds.length === 0) return { facts: [] };

    const now = new Date();
    const facts: StoryContinuityContext["facts"] = [];

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
