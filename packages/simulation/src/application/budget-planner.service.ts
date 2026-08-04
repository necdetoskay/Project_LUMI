import type { EntityRelevance, RelevanceBubble } from "../domain";
import type { NpcSnapshot } from "../ports";
import { assertKnownTimePhase, type TimePhase } from "../domain";

export interface BudgetAllocation {
  npcId: string;
  tokens: number;
  reason: string;
}

export interface BudgetPlan {
  worldId: string;
  householdId: string;
  timePhase: TimePhase;
  totalBudget: number;
  allocations: BudgetAllocation[];
  relevanceBubble: RelevanceBubble | null;
  runHash: string;
}

function computeNpcRelevance(
  npc: NpcSnapshot,
  now: Date,
): EntityRelevance {
  const daysSinceInteraction =
    (now.getTime() - npc.lastInteractionAt.getTime()) / (1000 * 60 * 60 * 24);

  const relationshipScore = npc.relationshipToCharacter;
  const recencyScore = Math.max(0, 1 - daysSinceInteraction / 30);
  const proximityScore = npc.locationId !== null ? 0.5 : 0.2;

  const score = (relationshipScore * 0.5 + recencyScore * 0.3 + proximityScore * 0.2);

  const reasons: string[] = [];
  if (relationshipScore > 0.7) reasons.push("high relationship");
  if (recencyScore > 0.7) reasons.push("recent interaction");
  if (proximityScore > 0.4) reasons.push("nearby");

  return {
    entityId: npc.npcId,
    entityKind: "npc",
    score,
    reason: reasons.join("; ") || "default",
    needTypes: npc.needTypes as never,
    lastInteractionAt: npc.lastInteractionAt,
  };
}

export class BudgetPlanner {
  private readonly PHASE_BUDGET_MULTIPLIER: Record<TimePhase, number> = {
    normal: 1.0,
    reduced: 0.5,
    limited: 0.2,
    frozen: 0.0,
  };

  plan(
    worldId: string,
    householdId: string,
    timePhase: TimePhase,
    totalBudget: number,
    npcs: NpcSnapshot[],
    now: Date,
  ): BudgetPlan {
    assertKnownTimePhase(timePhase);
    const multiplier = this.PHASE_BUDGET_MULTIPLIER[timePhase];
    const effectiveBudget = Math.floor(totalBudget * multiplier);

    const relevances: EntityRelevance[] = npcs.map((n) =>
      computeNpcRelevance(n, now),
    );

    const sorted = [...relevances].sort((a, b) => b.score - a.score);
    const threshold = 0.2;
    const bubble: RelevanceBubble = {
      worldId,
      householdId,
      entities: sorted.filter((r) => r.score >= threshold),
      threshold,
    };

    const allocations: BudgetAllocation[] = [];
    let remaining = effectiveBudget;

    for (const rel of bubble.entities) {
      if (remaining <= 0) break;
      const allocation = Math.min(remaining, Math.ceil(rel.score * 10));
      allocations.push({
        npcId: rel.entityId,
        tokens: allocation,
        reason: rel.reason,
      });
      remaining -= allocation;
    }

    const runHash = this.computeRunHash(
      worldId,
      householdId,
      timePhase,
      effectiveBudget,
      bubble.entities.map((e) => ({ id: e.entityId, score: e.score })),
    );

    return {
      worldId,
      householdId,
      timePhase,
      totalBudget: effectiveBudget,
      allocations,
      relevanceBubble: bubble,
      runHash,
    };
  }

  private computeRunHash(
    worldId: string,
    householdId: string,
    timePhase: TimePhase,
    budget: number,
    entities: Array<{ id: string; score: number }>,
  ): string {
    const data = JSON.stringify({
      worldId,
      householdId,
      timePhase,
      budget,
      entities: entities
        .map((e) => `${e.id}:${e.score}`)
        .sort()
        .join("|"),
    });
    let h = 0x811c9dc5;
    for (let i = 0; i < data.length; i++) {
      h ^= data.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, "0");
  }
}
