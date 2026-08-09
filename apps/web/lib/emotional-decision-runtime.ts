import { getCharacterDomain } from "@lumi/profiles/application";
import {
  DecisionContextBuilder,
  GoalEvaluator,
  NeedEvaluator,
  toNeedPressureLookup,
} from "@lumi/npc-intelligence/application";
import type { DecisionContextVector } from "@lumi/npc-intelligence/domain";

export interface PersistedDecisionContextInput {
  userId: string;
  householdId: string;
  characterId: string;
  timeSensitivity?: number;
}

/**
 * Production composition boundary from persisted profile character state to
 * the NPC decision context consumed by UtilityEvaluator.
 *
 * No caller-supplied emotion vector is accepted: emotions always come from the
 * persisted character domain snapshot resolved under household ownership.
 */
export class PersistedCharacterDecisionContextAdapter {
  private readonly needs = new NeedEvaluator();
  private readonly goals = new GoalEvaluator();
  private readonly context = new DecisionContextBuilder();

  async resolve(
    input: PersistedDecisionContextInput,
  ): Promise<DecisionContextVector> {
    const character = await getCharacterDomain(
      input.userId,
      input.householdId,
      input.characterId,
    );
    const timeSensitivity = input.timeSensitivity ?? 0;
    const needResult = this.needs.evaluate({
      needs: character.needs,
      conditions: [],
      timeSensitivity,
    });
    const goalResult = this.goals.evaluate({
      goals: character.goals,
      needPressures: toNeedPressureLookup(needResult.pressures),
      timeSensitivity,
    });

    return this.context.build({
      npcId: character.id,
      householdId: character.householdId,
      traits: character.traits,
      emotions: character.emotions,
      influence: character.influence,
      relationships: character.relationships.map((relationship) => ({
        targetCharacterId: relationship.targetCharacterId,
        trust: relationship.trust,
        affinity: relationship.affinity,
        familiarity: relationship.familiarity,
        relationshipType: relationship.relationshipType,
      })),
      needs: needResult.pressures,
      goals: goalResult.evaluations,
      timeSensitivity,
      urgency: needResult.urgency,
    });
  }
}
