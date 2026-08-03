import type {
  CandidateAction,
  DecisionContextVector,
  PerceivedFact,
  PerceptionWindow,
} from "../domain";
import { createSeededRng } from "../domain/seeded-rng";
import type { NpcSafetySnapshot } from "../ports/safety-source.port";
import {
  CANDIDATE_TEMPLATES,
  computePersonalityFit,
} from "./candidate-templates";

export interface CandidateGenerationInput {
  npcId: string;
  householdId: string;
  vector: DecisionContextVector;
  window: PerceptionWindow;
  safety: NpcSafetySnapshot;
  seed: string;
  /** Upper bound of generated candidates. */
  maxCandidates: number;
}

export interface CandidateGenerationResult {
  candidates: CandidateAction[];
  generatedKinds: string[];
}

/**
 * Generates bounded candidate actions from what the NPC can perceive.
 *
 * Rules:
 * - templates are instantiated only when the NPC holds the required perceived
 *   fact or a nearby character to target;
 * - personality fit is derived from trait affinity;
 * - safety policy forbids candidate kinds or marks them conditional;
 * - generation is deterministic for the same input + seed.
 */
export class CandidateGenerator {
  generate(input: CandidateGenerationInput): CandidateGenerationResult {
    const rng = createSeededRng(input.seed);
    const factByCategory = this.indexFacts(input.window.perceivedFacts);
    const nearbyIds = input.window.nearbyCharacterIds;

    const candidates: CandidateAction[] = [];
    const generatedKinds = new Set<string>();

    for (const template of CANDIDATE_TEMPLATES) {
      if (candidates.length >= input.maxCandidates) break;

      const hasFact =
        template.requiredFactCategory === undefined ||
        (factByCategory.get(template.requiredFactCategory)?.length ?? 0) > 0;

      if (!hasFact) continue;

      const targetCharacterId =
        template.requiresNearbyCharacter && nearbyIds.length > 0
          ? rng.pick(nearbyIds)
          : null;

      if (template.requiresNearbyCharacter && !targetCharacterId) continue;

      const personalityFit = computePersonalityFit(
        template,
        input.vector.traits,
      );

      const forbidden = input.safety.forbiddenCandidateKinds.includes(
        template.kind,
      );
      const safety = forbidden
        ? "blocked"
        : template.riskLevel === "conditional"
          ? "conditional"
          : "safe";

      candidates.push({
        id: `${template.id}:${targetCharacterId ?? "self"}`,
        kind: template.kind,
        description: template.description,
        requiredFactIds: [],
        targetCharacterId,
        needTypes: [...template.needTypes],
        personalityFit,
        safety,
      });
      generatedKinds.add(template.kind);
    }

    return { candidates, generatedKinds: [...generatedKinds].sort() };
  }

  private indexFacts(
    facts: ReadonlyArray<PerceivedFact>,
  ): Map<string, PerceivedFact[]> {
    const map = new Map<string, PerceivedFact[]>();
    for (const fact of facts) {
      const list = map.get(fact.category) ?? [];
      list.push(fact);
      map.set(fact.category, list);
    }
    return map;
  }
}
