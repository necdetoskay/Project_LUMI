import type { SimulationStorePort } from "../ports";
import type { SimulationEffect } from "../domain";

export interface RecapEntry {
  id: string;
  effectType: string;
  severity: string;
  summary: string;
  detail: string;
  committedAt: Date;
  npcId: string | null;
  payload: Record<string, unknown>;
}

export interface RecapResult {
  worldId: string;
  householdId: string;
  entries: RecapEntry[];
  totalCommitted: number;
  recapGeneratedAt: Date;
}

export class RecapService {
  constructor(private readonly store: SimulationStorePort) {}

  async buildRecap(
    worldId: string,
    householdId: string,
    since?: Date,
  ): Promise<RecapResult> {
    const effects = await this.store.findCommittedEffects(
      worldId,
      householdId,
      since,
    );

    const entries: RecapEntry[] = effects.map((effect: SimulationEffect) => ({
      id: effect.id,
      effectType: effect.effectType,
      severity: effect.severity,
      summary: this.summarizeEffect(effect),
      detail: this.detailEffect(effect),
      committedAt: effect.committedAt ?? effect.createdAt,
      npcId: effect.npcId,
      payload: effect.payload,
    }));

    entries.sort((a, b) => a.committedAt.getTime() - b.committedAt.getTime());

    return {
      worldId,
      householdId,
      entries,
      totalCommitted: effects.length,
      recapGeneratedAt: new Date(),
    };
  }

  private summarizeEffect(effect: SimulationEffect): string {
    switch (effect.effectType) {
      case "npc_routine": {
        const action = (effect.payload as Record<string, unknown>).action as string;
        const npcName = effect.npcId ? `NPC ${effect.npcId.slice(0, 8)}` : "Bir karakter";
        return `${npcName} ${action}`;
      }
        case "environment_change": {
        const desc = (effect.payload as Record<string, unknown>).description as string;
        return desc ?? "Dünya biraz değişti.";
      }
        case "scheduled_event_trigger": {
        return "Bir etkinlik gelişti.";
      }
        case "npc_relationship_change":
        return "Karakterler arasındaki ilişki hafifçe değişti.";
      case "location_condition_change":
        return "Bir yer durumu değişti.";
      case "ecology_change":
        return "Doğa biraz daha canlı.";
      case "item_degradation":
        return "Bir eşya aşındı.";
      case "npc_state_update":
        return "Bir karakterin durumu güncellendi.";
      default:
        return "Dünyada bir şeyler oldu.";
    }
  }

  private detailEffect(effect: SimulationEffect): string {
    const evidence = effect.evidence as Record<string, unknown> | null | undefined;
    return typeof evidence?.source === "string" ? evidence.source : "simulation";
  }
}
