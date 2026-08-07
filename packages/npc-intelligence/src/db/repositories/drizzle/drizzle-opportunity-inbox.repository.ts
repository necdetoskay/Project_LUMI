import { and, eq, gte, lte } from "drizzle-orm";

import type { Database } from "../../client";
import type { OpportunityInboxPort } from "../../../ports/opportunity-inbox.port";
import { InteractionOpportunity } from "../../../domain/opportunity";
import type { InteractionOpportunityState } from "../../../domain/opportunity";
import type { OpportunityStatus } from "../../../domain/opportunity";
import { opportunityInbox } from "../../schema/npc-intelligence";

function stateToRow(
  opportunity: InteractionOpportunity,
  idempotencyKey: string,
) {
  const s = opportunity.getState();
  return {
    id: s.id,
    householdId: s.householdId,
    sourceNpcId: s.sourceNpcId,
    childProfileId: s.childProfileId,
    opportunityType: s.opportunityType,
    status: s.status,
    message: s.message,
    evidence: s.evidence as object,
    score: s.score,
    reason: s.reason,
    idempotencyKey,
    expiresAt: s.expiresAt,
    respondedAt: s.respondedAt,
    createdAt: s.createdAt,
  };
}

function rowToState(row: {
  id: string;
  householdId: string;
  sourceNpcId: string;
  childProfileId: string;
  opportunityType: string;
  status: string;
  message: string;
  evidence: unknown;
  score: number;
  reason: string;
  expiresAt: Date;
  respondedAt: Date | null;
  createdAt: Date;
}): InteractionOpportunity {
  const state: InteractionOpportunityState = {
    id: row.id,
    schemaVersion: 1,
    householdId: row.householdId,
    sourceNpcId: row.sourceNpcId,
    childProfileId: row.childProfileId,
    opportunityType:
      row.opportunityType as InteractionOpportunityState["opportunityType"],
    message: row.message,
    evidence: (row.evidence ?? {}) as Record<string, unknown>,
    score: row.score,
    cooldownKeys: [],
    expiresAt: row.expiresAt,
    status: row.status as OpportunityStatus,
    respondedAt: row.respondedAt,
    reason: row.reason,
    createdAt: row.createdAt,
  };
  return InteractionOpportunity.fromState(state);
}

/**
 * Production `OpportunityInboxPort` implementation backed by PostgreSQL.
 * All reads are household-scoped; the child list excludes expired rows.
 */
export class DrizzleOpportunityInboxRepository implements OpportunityInboxPort {
  constructor(private readonly db: Database) {}

  async deliver(
    opportunity: InteractionOpportunity,
    idempotencyKey: string,
  ): Promise<void> {
    await this.db
      .insert(opportunityInbox)
      .values(stateToRow(opportunity, idempotencyKey))
      .onConflictDoNothing();
  }

  async findByIdempotencyKey(
    householdId: string,
    idempotencyKey: string,
  ): Promise<InteractionOpportunity | undefined> {
    const [row] = await this.db
      .select()
      .from(opportunityInbox)
      .where(
        and(
          eq(opportunityInbox.householdId, householdId),
          eq(opportunityInbox.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    return row ? rowToState(row) : undefined;
  }

  async findById(
    householdId: string,
    opportunityId: string,
  ): Promise<InteractionOpportunity | undefined> {
    const [row] = await this.db
      .select()
      .from(opportunityInbox)
      .where(
        and(
          eq(opportunityInbox.householdId, householdId),
          eq(opportunityInbox.id, opportunityId),
        ),
      )
      .limit(1);
    return row ? rowToState(row) : undefined;
  }

  async listProposedForChild(
    householdId: string,
    childProfileId: string,
    now: Date,
  ): Promise<InteractionOpportunity[]> {
    const rows = await this.db
      .select()
      .from(opportunityInbox)
      .where(
        and(
          eq(opportunityInbox.householdId, householdId),
          eq(opportunityInbox.childProfileId, childProfileId),
          eq(opportunityInbox.status, "proposed"),
          gte(opportunityInbox.expiresAt, now),
        ),
      )
      .orderBy(opportunityInbox.createdAt);
    return rows.map(rowToState);
  }

  async transitionStatus(
    opportunityId: string,
    status: OpportunityStatus,
    now: Date,
  ): Promise<void> {
    await this.db
      .update(opportunityInbox)
      .set({ status, respondedAt: now })
      .where(eq(opportunityInbox.id, opportunityId));
  }

  async markExpired(
    householdId: string,
    childProfileId: string,
    now: Date,
  ): Promise<number> {
    const rows = await this.db
      .select({ id: opportunityInbox.id })
      .from(opportunityInbox)
      .where(
        and(
          eq(opportunityInbox.householdId, householdId),
          eq(opportunityInbox.childProfileId, childProfileId),
          eq(opportunityInbox.status, "proposed"),
          lte(opportunityInbox.expiresAt, now),
        ),
      );
    for (const row of rows) {
      await this.db
        .update(opportunityInbox)
        .set({ status: "expired", respondedAt: null })
        .where(eq(opportunityInbox.id, row.id));
    }
    return rows.length;
  }
}
