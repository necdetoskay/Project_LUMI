import { and, eq } from "drizzle-orm";
import type { Belief } from "../../../domain/belief";
import type { NpcBeliefSourcePort } from "../../../ports/belief-source.port";
import { getNpcDb, type Database } from "../../client";
import { npcBeliefs } from "../../schema/npc-intelligence/beliefs";

export class DrizzleBeliefSourceRepository implements NpcBeliefSourcePort {
  constructor(private readonly db: Database = getNpcDb()) {}

  async getBeliefs(npcId: string, householdId: string): Promise<Belief[]> {
    const rows = await this.db
      .select()
      .from(npcBeliefs)
      .where(
        and(
          eq(npcBeliefs.npcId, npcId),
          eq(npcBeliefs.householdId, householdId),
        ),
      );

    return rows.map((row) => ({
      id: row.id,
      npcId: row.npcId,
      householdId: row.householdId,
      factId: row.factId,
      claim: row.claim,
      confidence: Number(row.confidence),
      source: row.source as Belief["source"],
      provenance: row.provenance ?? [],
      createdAt: row.createdAt,
      lastVerifiedAt: row.lastVerifiedAt,
      expiresAt: row.expiresAt,
      status: row.status as Belief["status"],
    }));
  }

  async saveBeliefs(
    npcId: string,
    householdId: string,
    beliefs: Belief[],
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const belief of beliefs) {
        await tx
          .insert(npcBeliefs)
          .values({
            id: belief.id,
            npcId,
            householdId,
            factId: belief.factId,
            claim: belief.claim,
            confidence: String(belief.confidence),
            source: belief.source,
            provenance: belief.provenance,
            createdAt: belief.createdAt,
            lastVerifiedAt: belief.lastVerifiedAt,
            expiresAt: belief.expiresAt,
            status: belief.status,
          })
          .onConflictDoNothing();
      }
    });
  }
}
