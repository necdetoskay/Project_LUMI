import {
  InteractionOpportunity,
  type CreateInteractionOpportunityInput,
  type OpportunityType,
} from "../domain/opportunity";
import type { PerceptionWindow, PerceivedFact } from "../domain/perception";
import type { Belief } from "../domain/belief";
import { isActiveBelief } from "../domain/belief";
import { NpcIntelligenceError } from "../domain/errors";
import { createSeededRng } from "../domain/seeded-rng";

export const GENERATION_TIMEOUT = 60_000;

export interface OpportunityGenerationInput {
  npcId: string;
  householdId: string;
  childProfileId: string;
  window: PerceptionWindow;
  /** Active beliefs the NPC holds (information access gate). */
  beliefs: Belief[];
  /** Target character id → trust level (0..1) for invitations. */
  relationshipTrust: Record<string, number>;
  /** Parent/safety policy: opportunity types that are forbidden. */
  forbiddenOpportunityTypes: OpportunityType[];
  /** Cooldown keys already fired (dedup before generation). */
  firedCooldownKeys: ReadonlySet<string>;
  /** Expiry horizon for generated opportunities. */
  expiresAt: Date;
  seed: string;
  /** Upper bound of generated opportunities. */
  maxOpportunities?: number;
}

export interface OpportunityGenerationResult {
  opportunities: InteractionOpportunity[];
  reasons: string[];
}

interface CandidateTemplate {
  type: OpportunityType;
  /** Fact categories this template can source from. */
  factCategories: PerceivedFact["category"][];
}

const CANDIDATE_TEMPLATES: readonly CandidateTemplate[] = [
  {
    type: "rumor",
    factCategories: ["event", "location", "weather", "time"],
  },
  {
    type: "invitation",
    factCategories: ["location"],
  },
];

/**
 * Deterministically generates bounded rumor/invitation opportunities from what
 * the NPC perceives and holds as an active belief.
 *
 * Rules:
 * - rumor requires an active belief whose fact is event/location/weather/time;
 * - invitation requires a nearby character with a relationship + a location;
 * - information access: an NPC can only surface facts it holds a belief about;
 * - parent/safety policy forbids opportunity types before generation;
 * - fired cooldown keys are skipped (dedup);
 * - same input + seed produces the same opportunity set.
 */
export class InteractionOpportunityGenerator {
  generate(input: OpportunityGenerationInput): OpportunityGenerationResult {
    const rng = createSeededRng(input.seed);
    const opportunities: InteractionOpportunity[] = [];
    const reasons: string[] = [];
    const max = input.maxOpportunities ?? 3;

    const activeBeliefs = input.beliefs.filter((b) =>
      isActiveBelief(b, input.window.reachedAt),
    );
    const beliefByFactId = new Map(activeBeliefs.map((b) => [b.factId, b]));
    const byCategory = new Map<PerceivedFact["category"], PerceivedFact[]>();
    for (const fact of input.window.perceivedFacts) {
      const list = byCategory.get(fact.category) ?? [];
      list.push(fact);
      byCategory.set(fact.category, list);
    }

    // Parent/safety policy: eliminate forbidden types before scoring.
    const allowedTemplates = CANDIDATE_TEMPLATES.filter(
      (t) => !input.forbiddenOpportunityTypes.includes(t.type),
    );
    if (allowedTemplates.length === 0) {
      reasons.push("all opportunity types forbidden by policy");
      return { opportunities, reasons };
    }

    for (const template of allowedTemplates) {
      if (opportunities.length >= max) break;

      const sources =
        byCategory.get("event") ??
        byCategory.get("location") ??
        byCategory.get("weather") ??
        byCategory.get("time") ??
        [];

      if (template.type === "rumor") {
        const rumorFact = this.pickRumorSource(sources, activeBeliefs, rng);
        if (!rumorFact) {
          reasons.push("rumor skipped: no belief-backed rumor source");
          continue;
        }
        const key = `source:${input.npcId}:rumor`;
        if (input.firedCooldownKeys.has(key)) {
          reasons.push(`rumor skipped: cooldown ${key}`);
          continue;
        }
        const belief = beliefByFactId.get(rumorFact.factId);
        if (!belief) {
          reasons.push(
            `rumor skipped: no active belief for fact ${rumorFact.factId}`,
          );
          continue;
        }
        opportunities.push(
          this.makeOpportunity({
            ...input,
            type: "rumor",
            message: `I heard something about ${rumorFact.claim.toLowerCase()}.`,
            evidence: {
              factId: rumorFact.factId,
              beliefId: belief.id,
              confidence: belief.confidence,
              source: belief.source,
            },
            cooldownKeys: [key],
            reason: `rumor from active belief ${belief.id}`,
          }),
        );
        continue;
      }

      if (template.type === "invitation") {
        const invitation = this.pickInvitation(input, byCategory, rng);
        if (!invitation) continue;
        const key = `pair:${input.npcId}:${invitation.target}:invitation`;
        if (input.firedCooldownKeys.has(key)) {
          reasons.push(`invitation skipped: cooldown ${key}`);
          continue;
        }
        opportunities.push(
          this.makeOpportunity({
            ...input,
            type: "invitation",
            message: `Would you like to join me at ${invitation.placeClaim}?`,
            evidence: {
              targetNpcId: invitation.target,
              trust: invitation.trust,
              placeFactId: invitation.placeFactId,
            },
            cooldownKeys: [key],
            reason: `invitation to ${invitation.target} (trust ${invitation.trust})`,
          }),
        );
      }
    }

    if (opportunities.length === 0) {
      reasons.push("no eligible opportunities generated");
    }
    return { opportunities, reasons };
  }

  private pickRumorSource(
    sources: PerceivedFact[],
    beliefs: Belief[],
    rng: ReturnType<typeof createSeededRng>,
  ): PerceivedFact | null {
    const beliefFactIds = new Set(beliefs.map((b) => b.factId));
    const eligible = sources.filter((f) => beliefFactIds.has(f.factId));
    if (eligible.length === 0) return null;
    return rng.pick(eligible);
  }

  private pickInvitation(
    input: OpportunityGenerationInput,
    byCategory: Map<string, PerceivedFact[]>,
    rng: ReturnType<typeof createSeededRng>,
  ): {
    target: string;
    trust: number;
    placeClaim: string;
    placeFactId: string;
  } | null {
    const nearby = input.window.nearbyCharacterIds.filter(
      (id) => (input.relationshipTrust[id] ?? 0) > 0,
    );
    if (nearby.length === 0) return null;
    const target = rng.pick(nearby);
    const locationFacts = byCategory.get("location") ?? [];
    if (locationFacts.length === 0) return null;
    const place = rng.pick(locationFacts);
    return {
      target,
      trust: input.relationshipTrust[target] ?? 0,
      placeClaim: place.claim,
      placeFactId: place.factId,
    };
  }

  private makeOpportunity(
    input: OpportunityGenerationInput & {
      type: OpportunityType;
      message: string;
      evidence: Record<string, unknown>;
      cooldownKeys: string[];
      reason: string;
    },
  ): InteractionOpportunity {
    const createInput: CreateInteractionOpportunityInput = {
      householdId: input.householdId,
      sourceNpcId: input.npcId,
      childProfileId: input.childProfileId,
      opportunityType: input.type,
      message: input.message,
      evidence: input.evidence,
      score: 0,
      cooldownKeys: input.cooldownKeys,
      expiresAt: input.expiresAt,
      reason: input.reason,
    };
    const opportunity = InteractionOpportunity.create(createInput);
    return opportunity;
  }
}

export function assertFiredCooldownKeys(keys: ReadonlySet<string>): void {
  for (const key of keys) {
    if (typeof key !== "string" || key.length === 0) {
      throw new NpcIntelligenceError(
        "INVALID_COOLDOWN_KEY",
        "Cooldown keys must be non-empty strings",
      );
    }
  }
}
