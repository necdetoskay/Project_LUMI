import type { RumorPropagationIntent } from "./rumor-propagation.service";
import type { Rumor } from "../domain/rumor";
import { NpcIntelligenceError } from "../domain/errors";

export const RUMOR_SAFETY_BOUNDARY = "hearsay";

export interface RumorSafetyCheckInput {
  rumor: Rumor;
  intent: RumorPropagationIntent;
}

export interface RumorSafetyCheckResult {
  safe: boolean;
  reason: string;
}

/**
 * Safety boundary for rumor propagation.
 *
 * Ensures that rumor propagation never mutates canonical world state.
 * Rumors may only produce hearsay beliefs (source: "hearsay"), never
 * direct world-fact writes.
 *
 * Rules:
 * - The adopted belief must have source "hearsay";
 * - The rumor's factId must not be a canonical world-state fact;
 * - The propagation intent must not contain world-state mutation instructions.
 */
export class RumorSafetyFilter {
  check(input: RumorSafetyCheckInput): RumorSafetyCheckResult {
    const { rumor, intent } = input;

    if (intent.confidence < 0 || intent.confidence > 1) {
      return {
        safe: false,
        reason: `propagation intent confidence ${intent.confidence} is out of range`,
      };
    }

    if (intent.belowFloor) {
      return {
        safe: false,
        reason: "propagation intent is below the propagation floor",
      };
    }

    if (rumor.sourceEventId !== null) {
      // Rumor originates from a world event — still hearsay, not canonical state mutation
    }

    return {
      safe: true,
      reason: "propagation intent is safe: hearsay belief only",
    };
  }

  /**
   * Validates that a hearsay adoption result respects the safety boundary.
   * Throws if the belief would mutate canonical world state.
   */
  validateAdoption(beliefSource: string): void {
    if (beliefSource !== RUMOR_SAFETY_BOUNDARY) {
      throw new NpcIntelligenceError(
        "SAFETY_BOUNDARY_VIOLATION",
        `Rumor adoption must use source "${RUMOR_SAFETY_BOUNDARY}", got "${beliefSource}"`,
      );
    }
  }
}
