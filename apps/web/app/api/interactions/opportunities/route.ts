import { NextResponse } from "next/server";
import { z } from "zod";
import { withParent } from "@/lib/auth/with-parent";
import { getOwnedHousehold } from "@lumi/profiles/application";
import { OpportunityDeliveryService } from "@lumi/npc-intelligence/application";
import { DrizzleOpportunityInboxRepository } from "@lumi/npc-intelligence/db";
import { getNpcDb } from "@lumi/npc-intelligence/db";
import { observeHandler } from "@/lib/observability/observed-api-route";

const querySchema = z.object({
  householdId: z.string().uuid(),
  childProfileId: z.string().uuid(),
});

function opportunityToSummary(opportunity: {
  id: string;
  opportunityType: string;
  message: string;
  evidence: Record<string, unknown>;
  score: number;
  expiresAt: Date;
  sourceNpcId: string;
}): {
  id: string;
  type: string;
  message: string;
  evidence: Record<string, unknown>;
  score: number;
  expiresAt: string;
  sourceNpcId: string;
} {
  return {
    id: opportunity.id,
    type: opportunity.opportunityType,
    message: opportunity.message,
    evidence: opportunity.evidence,
    score: opportunity.score,
    expiresAt: opportunity.expiresAt.toISOString(),
    sourceNpcId: opportunity.sourceNpcId,
  };
}

export const GET = observeHandler(async (request: Request) => {
  return withParent(async (parent) => {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      householdId: searchParams.get("householdId"),
      childProfileId: searchParams.get("childProfileId"),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: parsed.error.message },
        { status: 400 },
      );
    }

    const household = await getOwnedHousehold(parent.id);
    if (!household || household.id !== parsed.data.householdId) {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "User does not have access to this household",
        },
        { status: 403 },
      );
    }

    const service = new OpportunityDeliveryService(
      new DrizzleOpportunityInboxRepository(getNpcDb()),
    );
    const opportunities = await service.listProposedForChild(
      parsed.data.householdId,
      parsed.data.childProfileId,
    );

    return NextResponse.json({
      opportunities: opportunities.map((o) =>
        opportunityToSummary(o.getState()),
      ),
    });
  });
}, "/api/interactions/opportunities");
