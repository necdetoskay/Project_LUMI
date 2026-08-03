import type {
  CandidateAction,
  DecisionContextVector,
  UtilityComponents,
  UtilityScore,
  UtilityWeightPolicy,
} from "../domain";
import { computeUtilityScore } from "../domain/utility";
import { clamp01 } from "../domain/validation";
import { SAFETY_COMPONENT } from "./safety-components";

/**
 * Scores candidate actions against the NPC decision context and a versioned
 * weight policy.
 *
 * Rules:
 * - benefit components are 0..1; cost components are <= 0 penalties;
 * - the policy is versioned and validated before scoring;
 * - the score is a plain weighted sum; no candidate gets special treatment.
 */
export class UtilityEvaluator {
  evaluate(
    candidates: readonly CandidateAction[],
    context: DecisionContextVector,
    policy: UtilityWeightPolicy,
  ): UtilityScore[] {
    const needPressure = new Map(
      context.needs.map((n) => [n.needType, n.urgency]),
    );
    const goalPull = new Map(context.goals.map((g) => [g.needType, g.pull]));

    return candidates.map((candidate) => {
      const components = this.computeComponents(
        candidate,
        context,
        needPressure,
        goalPull,
      );
      const total = computeUtilityScore(components, policy);
      return {
        candidateId: candidate.id,
        total,
        components,
        policyVersion: policy.version,
        reasons: this.buildReasons(candidate, components),
      };
    });
  }

  private computeComponents(
    candidate: CandidateAction,
    context: DecisionContextVector,
    needPressure: Map<string, number>,
    goalPull: Map<string, number>,
  ): UtilityComponents {
    const needUrgencies = candidate.needTypes
      .map((n) => needPressure.get(n) ?? 0)
      .filter((n) => n > 0);
    const needSatisfaction =
      needUrgencies.length === 0
        ? 0
        : needUrgencies.reduce((sum, n) => sum + n, 0) / needUrgencies.length;

    const goalPulls = candidate.needTypes
      .map((n) => goalPull.get(n) ?? 0)
      .filter((n) => n > 0);
    const goalAlignment =
      goalPulls.length === 0
        ? 0
        : goalPulls.reduce((sum, n) => sum + n, 0) / goalPulls.length;

    const relationship = candidate.targetCharacterId
      ? context.relationships.find(
          (r) => r.targetCharacterId === candidate.targetCharacterId,
        )
      : undefined;
    const relationshipImpact = relationship
      ? clamp01(
          (relationship.trust +
            relationship.affinity +
            relationship.familiarity) /
            3,
        )
      : 0;

    const safety = SAFETY_COMPONENT[candidate.safety] ?? 0;
    const socialApproval = clamp01(context.influence.social);
    const emotionalComfort = this.computeEmotionalComfort(context);
    const curiosity = clamp01(
      (context.traits.curiosity ?? 0.5) +
        (context.influence.educational ?? 0) * 0.5,
    );

    return {
      needSatisfaction: Number(needSatisfaction.toFixed(6)),
      emotionalComfort: Number(emotionalComfort.toFixed(6)),
      safety: Number(safety.toFixed(6)),
      goalAlignment: Number(goalAlignment.toFixed(6)),
      relationshipImpact: Number(relationshipImpact.toFixed(6)),
      socialApproval: Number(socialApproval.toFixed(6)),
      curiosity: Number(curiosity.toFixed(6)),
      personalityFit: clamp01(candidate.personalityFit),
      timeSensitivity: clamp01(context.timeSensitivity),
      resourceCost: 0,
      timeCost: 0,
    };
  }

  private computeEmotionalComfort(context: DecisionContextVector): number {
    const joy = context.emotions.joy ?? 0.5;
    const trust = context.emotions.trust ?? 0.5;
    const fear = context.emotions.fear ?? 0.2;
    const anger = context.emotions.anger ?? 0.2;
    const sadness = context.emotions.sadness ?? 0.2;
    return clamp01(
      (joy + trust - fear * 0.5 - anger * 0.5 - sadness * 0.5) / 2,
    );
  }

  private buildReasons(
    candidate: CandidateAction,
    components: UtilityComponents,
  ): string[] {
    const reasons: string[] = [];
    const best = Object.entries(components)
      .filter(([key]) => key !== "resourceCost" && key !== "timeCost")
      .sort((a, b) => b[1] - a[1]);
    const top = best[0];
    if (top) {
      reasons.push(`${top[0]}=${top[1]}`);
    }
    reasons.push(`kind=${candidate.kind}`);
    return reasons;
  }
}
