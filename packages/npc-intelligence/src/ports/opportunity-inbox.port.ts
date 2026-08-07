import type { InteractionOpportunity } from "../domain/opportunity";
import type { OpportunityStatus } from "../domain/opportunity";

export interface OpportunityInboxPort {
  /** Delivers an opportunity (idempotent by idempotencyKey). */
  deliver(
    opportunity: InteractionOpportunity,
    idempotencyKey: string,
  ): Promise<void>;
  /** Looks up an opportunity by idempotency key. */
  findByIdempotencyKey(
    householdId: string,
    idempotencyKey: string,
  ): Promise<InteractionOpportunity | undefined>;
  /** Loads a single opportunity, household-scoped (used by accept flow). */
  findById(
    householdId: string,
    opportunityId: string,
  ): Promise<InteractionOpportunity | undefined>;
  /** Lists non-expired proposed opportunities for a child. */
  listProposedForChild(
    householdId: string,
    childProfileId: string,
    now: Date,
  ): Promise<InteractionOpportunity[]>;
  /** Transitions an opportunity to a new status. */
  transitionStatus(
    opportunityId: string,
    status: OpportunityStatus,
    now: Date,
  ): Promise<void>;
  /** Marks opportunities past expiry as expired. */
  markExpired(
    householdId: string,
    childProfileId: string,
    now: Date,
  ): Promise<number>;
}
