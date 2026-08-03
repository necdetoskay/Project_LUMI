import type { NeedType } from "@lumi/profiles";

import {
  CONDITION_EFFECTS,
  type NeedEvaluationInput,
  type NeedEvaluationResult,
  type NeedPressure,
} from "../domain";
import { clamp01 } from "../domain/validation";

/** Time sensitivity multiplies decay-driven urgency drift. */
export const NEED_DECAY_TIME_WEIGHT = 1;

/**
 * Evaluates an NPC's current need pressures.
 *
 * Rules:
 * - each need state contributes current tension and decay-driven urgency;
 * - active conditions add need pressure from their condition effect table and
 *   may raise time sensitivity;
 * - urgency for a need type is `current + decay * timeSensitivity`, clamped
 *   to 0..1;
 * - the dominant need is the highest-urgency pressure (deterministic tie-break
 *   by need type name);
 * - aggregate urgency is the mean of the top three pressure urgencies.
 */
export class NeedEvaluator {
  evaluate(input: NeedEvaluationInput): NeedEvaluationResult {
    let timeSensitivity = clamp01(input.timeSensitivity);

    const conditionPressureByNeed = new Map<NeedType, number>();
    for (const condition of input.conditions) {
      const effect = CONDITION_EFFECTS[condition];
      if (!effect) continue;
      timeSensitivity = clamp01(
        timeSensitivity + clamp01(effect.timeSensitivity),
      );
      for (const [needType, value] of Object.entries(effect.needs)) {
        const type = needType as NeedType;
        const existing = conditionPressureByNeed.get(type) ?? 0;
        conditionPressureByNeed.set(type, clamp01(Math.max(existing, value)));
      }
    }

    const pressureByNeed = new Map<NeedType, NeedPressure>();
    for (const need of input.needs) {
      pressureByNeed.set(need.needType, {
        needType: need.needType,
        current: clamp01(need.value),
        decay: clamp01(need.decay),
        urgency: this.computeUrgency(
          clamp01(need.value),
          clamp01(need.decay),
          timeSensitivity,
        ),
        source: "need_state",
      });
    }

    for (const [needType, current] of conditionPressureByNeed) {
      const existing = pressureByNeed.get(needType);
      if (existing) {
        const decay = clamp01(Math.max(existing.decay, 0));
        pressureByNeed.set(needType, {
          needType,
          current: clamp01(Math.max(existing.current, current)),
          decay,
          urgency: this.computeUrgency(
            clamp01(Math.max(existing.current, current)),
            decay,
            timeSensitivity,
          ),
          source: current >= existing.current ? "condition" : "need_state",
        });
      } else {
        pressureByNeed.set(needType, {
          needType,
          current,
          decay: 0,
          urgency: clamp01(current),
          source: "condition",
        });
      }
    }

    const pressures = [...pressureByNeed.values()];
    const sorted = [...pressures].sort(
      (a, b) => b.urgency - a.urgency || a.needType.localeCompare(b.needType),
    );

    const dominant = sorted[0];
    const topThree = sorted.slice(0, 3);
    const urgency =
      topThree.length === 0
        ? 0
        : topThree.reduce((sum, p) => sum + p.urgency, 0) / topThree.length;

    return {
      pressures,
      dominantNeedType: dominant?.needType ?? null,
      urgency: Number(urgency.toFixed(6)),
    };
  }

  private computeUrgency(
    current: number,
    decay: number,
    timeSensitivity: number,
  ): number {
    return clamp01(current + decay * timeSensitivity * NEED_DECAY_TIME_WEIGHT);
  }
}
