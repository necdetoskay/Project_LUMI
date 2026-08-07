import type { InteractionOpportunity } from "../domain/opportunity";
import { NpcIntelligenceError } from "../domain/errors";
import type { OpportunityInboxPort } from "../ports/opportunity-inbox.port";

export type { OpportunityInboxPort };

export interface OpportunityDeliveryInput {
  householdId: string;
  idempotencyKey: string;
  opportunity: InteractionOpportunity;
}

/**
 * Delivers an interaction opportunity to the child's inbox. Idempotent: the
 * same idempotency key never delivers twice. Applies expiry at delivery time.
 */
export class OpportunityDeliveryService {
  constructor(private readonly inbox: OpportunityInboxPort) {}

  async deliver(
    input: OpportunityDeliveryInput,
  ): Promise<"delivered" | "duplicate"> {
    if (input.opportunity.householdId !== input.householdId) {
      throw new NpcIntelligenceError(
        "OPPORTUNITY_HOUSEHOLD_MISMATCH",
        "Opportunity household does not match delivery household",
      );
    }
    const existing = await this.inbox.findByIdempotencyKey(
      input.householdId,
      input.idempotencyKey,
    );
    if (existing) {
      return "duplicate";
    }
    if (input.opportunity.isExpired()) {
      throw new NpcIntelligenceError(
        "OPPORTUNITY_EXPIRED",
        "Opportunity already expired at delivery time",
      );
    }
    await this.inbox.deliver(input.opportunity, input.idempotencyKey);
    return "delivered";
  }

  /**
   * Responds to an opportunity. Loads it (household-scoped) and applies the
   * domain accept/decline/defer guard so only proposed, non-expired
   * opportunities can be responded to; the transition is then persisted.
   */
  async respond(
    householdId: string,
    opportunityId: string,
    response: "accepted" | "declined" | "deferred",
    now = new Date(),
  ): Promise<void> {
    const opportunity = await this.inbox.findById(householdId, opportunityId);
    if (!opportunity) {
      throw new NpcIntelligenceError(
        "OPPORTUNITY_NOT_FOUND",
        `Opportunity ${opportunityId} not found`,
      );
    }

    switch (response) {
      case "accepted":
        opportunity.accept(now);
        break;
      case "declined":
        opportunity.decline(now);
        break;
      case "deferred":
        opportunity.defer(now);
        break;
    }

    await this.inbox.transitionStatus(opportunityId, response, now);
  }

  async expireStale(
    householdId: string,
    childProfileId: string,
    now = new Date(),
  ): Promise<number> {
    return this.inbox.markExpired(householdId, childProfileId, now);
  }

  /** Lists non-expired proposed opportunities for a child (household-scoped). */
  async listProposedForChild(
    householdId: string,
    childProfileId: string,
    now = new Date(),
  ): Promise<InteractionOpportunity[]> {
    return this.inbox.listProposedForChild(householdId, childProfileId, now);
  }
}
