import type { RumorLedgerPort } from "../ports/rumor-ledger.port";

export interface RumorLedgerGateInput {
  householdId: string;
  sourceNpcId: string;
  targetNpcId: string;
  factId: string;
}

export interface RumorLedgerGateResult {
  /** True if the propagation is allowed (not a duplicate). */
  allowed: boolean;
  /** True if the source-target-fact triple already exists. */
  duplicate: boolean;
}

/**
 * Dedup/idempotency ledger for rumor propagation.
 *
 * Same rumor (factId) must never re-propagate to the same target NPC
 * from the same source NPC. Household-scoped; cross-family forbidden.
 */
export class RumorLedgerService {
  constructor(private readonly ledger: RumorLedgerPort) {}

  async gate(input: RumorLedgerGateInput): Promise<RumorLedgerGateResult> {
    const duplicate = await this.ledger.hasPropagated(
      input.householdId,
      input.sourceNpcId,
      input.targetNpcId,
      input.factId,
    );

    return {
      allowed: !duplicate,
      duplicate,
    };
  }

  async recordPropagation(input: RumorLedgerGateInput): Promise<void> {
    const key = this.buildKey(
      input.sourceNpcId,
      input.targetNpcId,
      input.factId,
    );
    await this.ledger.recordPropagation({
      id: crypto.randomUUID(),
      householdId: input.householdId,
      propagationKey: key,
      sourceNpcId: input.sourceNpcId,
      targetNpcId: input.targetNpcId,
      factId: input.factId,
      createdAt: new Date(),
    });
  }

  private buildKey(
    sourceNpcId: string,
    targetNpcId: string,
    factId: string,
  ): string {
    return `pair:${sourceNpcId}:${targetNpcId}:${factId}`;
  }
}
