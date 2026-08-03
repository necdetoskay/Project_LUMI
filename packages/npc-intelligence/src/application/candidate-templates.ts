import type { NeedType, TraitDimension } from "@lumi/profiles";

import type { CandidateSafety, PerceivedFactCategory } from "../domain";
import { clamp01 } from "../domain/validation";

/**
 * Static catalog of bounded candidate action templates.
 *
 * Templates only express intents; a concrete candidate is only generated when
 * the NPC can attach information it actually perceives (a fact or a nearby
 * character), so an NPC can never act on knowledge it does not have.
 */
export interface CandidateTemplate {
  id: string;
  kind: string;
  description: string;
  needTypes: NeedType[];
  /** If set, the candidate requires at least one perceived fact of this category. */
  requiredFactCategory?: PerceivedFactCategory;
  /** If set, the candidate needs at least one nearby character to target. */
  requiresNearbyCharacter: boolean;
  /** Trait dimensions that raise personality fit (value: -1..1 affinity). */
  traitAffinity: Partial<Record<TraitDimension, number>>;
  /** Intrinsic safety before the parent policy is applied. */
  riskLevel: Exclude<CandidateSafety, "blocked">;
}

export const CANDIDATE_TEMPLATES: readonly CandidateTemplate[] = [
  {
    id: "seek_food",
    kind: "seek_food",
    description: "Look for food nearby",
    needTypes: ["hunger"],
    requiresNearbyCharacter: false,
    traitAffinity: { independence: 0.6, curiosity: 0.4 },
    riskLevel: "safe",
  },
  {
    id: "ask_adult_for_food",
    kind: "ask_for_help",
    description: "Ask a trusted adult for food",
    needTypes: ["hunger"],
    requiresNearbyCharacter: true,
    traitAffinity: { sociability: 0.6, independence: -0.4 },
    riskLevel: "safe",
  },
  {
    id: "rest_here",
    kind: "rest",
    description: "Rest in place",
    needTypes: ["rest"],
    requiresNearbyCharacter: false,
    traitAffinity: { patience: 0.5, discipline: 0.3 },
    riskLevel: "safe",
  },
  {
    id: "retreat_home",
    kind: "retreat_home",
    description: "Go back to a safe home area",
    needTypes: ["safety"],
    requiresNearbyCharacter: false,
    traitAffinity: { discipline: 0.4, courage: -0.4 },
    riskLevel: "safe",
  },
  {
    id: "ask_adult_for_help",
    kind: "ask_for_help",
    description: "Ask a trusted adult for help",
    needTypes: ["safety", "achievement"],
    requiresNearbyCharacter: true,
    traitAffinity: { sociability: 0.5, independence: -0.3 },
    riskLevel: "safe",
  },
  {
    id: "join_friends",
    kind: "socialize",
    description: "Join nearby friends",
    needTypes: ["belonging", "love"],
    requiresNearbyCharacter: true,
    traitAffinity: { sociability: 0.8 },
    riskLevel: "safe",
  },
  {
    id: "investigate_curiosity",
    kind: "investigate",
    description: "Investigate an interesting thing nearby",
    needTypes: ["curiosity", "learning"],
    requiredFactCategory: "item",
    requiresNearbyCharacter: false,
    traitAffinity: { curiosity: 0.9, courage: 0.3 },
    riskLevel: "conditional",
  },
  {
    id: "explore_location",
    kind: "explore",
    description: "Explore the current location",
    needTypes: ["curiosity", "freedom"],
    requiredFactCategory: "location",
    requiresNearbyCharacter: false,
    traitAffinity: { curiosity: 0.7, independence: 0.5 },
    riskLevel: "safe",
  },
  {
    id: "practice_skill",
    kind: "practice",
    description: "Practice a skill",
    needTypes: ["achievement", "learning"],
    requiresNearbyCharacter: false,
    traitAffinity: { discipline: 0.8, patience: 0.4 },
    riskLevel: "safe",
  },
  {
    id: "comfort_character",
    kind: "comfort",
    description: "Comfort a nearby character",
    needTypes: ["love", "belonging", "purpose"],
    requiresNearbyCharacter: true,
    traitAffinity: { compassion: 0.9, sociability: 0.3 },
    riskLevel: "safe",
  },
];

export function lookupCandidateTemplate(
  templateId: string,
): CandidateTemplate | undefined {
  return CANDIDATE_TEMPLATES.find((t) => t.id === templateId);
}

/**
 * Scores how well a template fits the NPC's current personality.
 * Returns 0..1 where 1 is a perfect fit.
 */
export function computePersonalityFit(
  template: CandidateTemplate,
  traits: Partial<Record<TraitDimension, number>>,
): number {
  const affinities = Object.entries(template.traitAffinity);
  if (affinities.length === 0) {
    return 0.5;
  }
  let total = 0;
  for (const [dimension, affinity] of affinities) {
    const traitValue = traits[dimension as TraitDimension] ?? 0.5;
    total += clamp01((traitValue - 0.5) * (affinity as number) + 0.5);
  }
  return clamp01(total / affinities.length);
}
