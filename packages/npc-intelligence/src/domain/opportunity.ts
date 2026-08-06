import { NpcIntelligenceError } from "./errors";

export const OPPORTUNITY_TYPES = ["rumor", "invitation"] as const;
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

export const OPPORTUNITY_STATUSES = [
  "proposed",
  "accepted",
  "declined",
  "deferred",
  "expired",
] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

export const OPPORTUNITY_SCHEMA_VERSION = 1;

/**
 * A spontaneous interaction opportunity an NPC offers the child. It is always
 * a *proposal* — the child can accept, decline, or defer. It is grounded in
 * evidence the NPC actually holds (beliefs, relationships, proximity) and is
 * governed by cooldown/novelty/expiry + safety filters before delivery.
 */
export interface InteractionOpportunityState {
  id: string;
  schemaVersion: number;
  householdId: string;
  /** NPC that proposes the opportunity. */
  sourceNpcId: string;
  /** Child profile this opportunity is proposed to. */
  childProfileId: string;
  opportunityType: OpportunityType;
  /** Human-readable surface text (LLM-drafted; delivery decided by rules). */
  message: string;
  /** Evidence grounding the opportunity (belief refs, event ids, proximity). */
  evidence: Record<string, unknown>;
  /** Deterministic score produced by the opportunity policy. */
  score: number;
  /** Cooldown/novelty keys for deduplication. */
  cooldownKeys: string[];
  /** Moment the opportunity is no longer valid. */
  expiresAt: Date;
  status: OpportunityStatus;
  /** Non-null once the child responds. */
  respondedAt: Date | null;
  /** Reason the opportunity was generated (traceable). */
  reason: string;
  createdAt: Date;
}

export interface CreateInteractionOpportunityInput {
  householdId: string;
  sourceNpcId: string;
  childProfileId: string;
  opportunityType: OpportunityType;
  message: string;
  evidence: Record<string, unknown>;
  score: number;
  cooldownKeys: string[];
  expiresAt: Date;
  reason: string;
  status?: OpportunityStatus;
}

function assertKnownOpportunityType(
  value: string,
): asserts value is OpportunityType {
  if (!(OPPORTUNITY_TYPES as readonly string[]).includes(value)) {
    throw new NpcIntelligenceError(
      "INVALID_OPPORTUNITY_TYPE",
      `Invalid opportunity type: ${value}`,
    );
  }
}

function assertKnownOpportunityStatus(
  value: string,
): asserts value is OpportunityStatus {
  if (!(OPPORTUNITY_STATUSES as readonly string[]).includes(value)) {
    throw new NpcIntelligenceError(
      "INVALID_OPPORTUNITY_STATUS",
      `Invalid opportunity status: ${value}`,
    );
  }
}

export class InteractionOpportunity {
  private constructor(private readonly state: InteractionOpportunityState) {}

  static create(
    input: CreateInteractionOpportunityInput,
  ): InteractionOpportunity {
    assertKnownOpportunityType(input.opportunityType);
    const status = input.status ?? "proposed";
    assertKnownOpportunityStatus(status);

    if (!input.householdId || !input.sourceNpcId || !input.childProfileId) {
      throw new NpcIntelligenceError(
        "OPPORTUNITY_MISSING_SCOPE",
        "Interaction opportunity requires householdId, sourceNpcId and childProfileId",
      );
    }
    if (!input.message.trim()) {
      throw new NpcIntelligenceError(
        "OPPORTUNITY_EMPTY_MESSAGE",
        "Interaction opportunity requires a message",
      );
    }
    if (!Number.isFinite(input.score)) {
      throw new NpcIntelligenceError(
        "OPPORTUNITY_INVALID_SCORE",
        "Interaction opportunity score must be finite",
      );
    }
    if (
      !(input.expiresAt instanceof Date) ||
      Number.isNaN(input.expiresAt.getTime())
    ) {
      throw new NpcIntelligenceError(
        "OPPORTUNITY_INVALID_EXPIRY",
        "Interaction opportunity requires a valid expiresAt",
      );
    }

    return new InteractionOpportunity({
      id: crypto.randomUUID(),
      schemaVersion: OPPORTUNITY_SCHEMA_VERSION,
      householdId: input.householdId,
      sourceNpcId: input.sourceNpcId,
      childProfileId: input.childProfileId,
      opportunityType: input.opportunityType,
      message: input.message.trim(),
      evidence: { ...input.evidence },
      score: input.score,
      cooldownKeys: [...input.cooldownKeys],
      expiresAt: input.expiresAt,
      status,
      respondedAt: null,
      reason: input.reason,
      createdAt: new Date(),
    });
  }

  static fromState(state: InteractionOpportunityState): InteractionOpportunity {
    assertKnownOpportunityType(state.opportunityType);
    assertKnownOpportunityStatus(state.status);
    return new InteractionOpportunity(state);
  }

  get id(): string {
    return this.state.id;
  }

  get schemaVersion(): number {
    return this.state.schemaVersion;
  }

  get householdId(): string {
    return this.state.householdId;
  }

  get sourceNpcId(): string {
    return this.state.sourceNpcId;
  }

  get childProfileId(): string {
    return this.state.childProfileId;
  }

  get opportunityType(): OpportunityType {
    return this.state.opportunityType;
  }

  get status(): OpportunityStatus {
    return this.state.status;
  }

  get score(): number {
    return this.state.score;
  }

  get cooldownKeys(): ReadonlyArray<string> {
    return this.state.cooldownKeys;
  }

  get expiresAt(): Date {
    return this.state.expiresAt;
  }

  get reason(): string {
    return this.state.reason;
  }

  get evidence(): Record<string, unknown> {
    return { ...this.state.evidence };
  }

  /** Child accepts the opportunity. */
  accept(now = new Date()): void {
    this.assertRespondable(now);
    this.state.status = "accepted";
    this.state.respondedAt = now;
  }

  /** Child declines — never punished. */
  decline(now = new Date()): void {
    this.assertRespondable(now);
    this.state.status = "declined";
    this.state.respondedAt = now;
  }

  /** Child defers for later review. */
  defer(now = new Date()): void {
    this.assertRespondable(now);
    this.state.status = "deferred";
    this.state.respondedAt = now;
  }

  /** Expiry silently closes the opportunity (never becomes an active task). */
  expire(): void {
    if (this.state.status !== "proposed") return;
    this.state.status = "expired";
    this.state.respondedAt = null;
  }

  /** True if the opportunity is still valid at `now`. */
  isExpired(now = new Date()): boolean {
    return now.getTime() > this.state.expiresAt.getTime();
  }

  private assertRespondable(now: Date): void {
    if (this.state.status !== "proposed") {
      throw new NpcIntelligenceError(
        "OPPORTUNITY_NOT_RESPONDABLE",
        `Opportunity is ${this.state.status}, only proposed can be responded to`,
      );
    }
    if (this.isExpired(now)) {
      throw new NpcIntelligenceError(
        "OPPORTUNITY_EXPIRED",
        "Opportunity has expired and cannot be responded to",
      );
    }
  }

  getState(): InteractionOpportunityState {
    return {
      ...this.state,
      evidence: { ...this.state.evidence },
      cooldownKeys: [...this.state.cooldownKeys],
    };
  }
}
