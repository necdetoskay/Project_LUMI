import type { OpportunityType } from "../domain/opportunity";
import { NpcIntelligenceError } from "../domain/errors";

export const OPPORTUNITY_RISK_LEVELS = ["safe", "conditional"] as const;
export type OpportunityRiskLevel = (typeof OPPORTUNITY_RISK_LEVELS)[number];

/**
 * Risk classification per opportunity type. `conditional` types require
 * parent approval before delivery.
 */
export const OPPORTUNITY_RISK: Record<OpportunityType, OpportunityRiskLevel> = {
  rumor: "safe",
  invitation: "conditional",
};

export interface OpportunitySafetySnapshot {
  /** Opportunity types the parent/safety policy forbids entirely. */
  forbiddenOpportunityTypes: OpportunityType[];
  /** Whether `conditional` types need explicit parent approval. */
  requireParentApprovalForConditional: boolean;
  /** Age band of the child (e.g. "5-7", "8-12") for type suitability. */
  childAgeBand: string;
}

export interface OpportunitySafetyDecision {
  opportunityType: OpportunityType;
  /** "safe" | "conditional" | "blocked" */
  verdict: "safe" | "conditional" | "blocked";
  reason: string;
}

/**
 * Applies child-safety + parent-policy filters to an opportunity type.
 * Blocked types are eliminated before scoring (no delivery). Conditional types
 * are allowed but flagged for parent approval.
 */
export class OpportunitySafetyFilter {
  filter(
    opportunityType: OpportunityType,
    safety: OpportunitySafetySnapshot,
  ): OpportunitySafetyDecision {
    if (safety.forbiddenOpportunityTypes.includes(opportunityType)) {
      return {
        opportunityType,
        verdict: "blocked",
        reason: `opportunity type ${opportunityType} forbidden by parent policy`,
      };
    }

    const risk = OPPORTUNITY_RISK[opportunityType];
    if (risk === "conditional") {
      if (safety.requireParentApprovalForConditional) {
        return {
          opportunityType,
          verdict: "conditional",
          reason: `opportunity type ${opportunityType} requires parent approval`,
        };
      }
      return {
        opportunityType,
        verdict: "safe",
        reason: `conditional type ${opportunityType} allowed without approval`,
      };
    }

    return {
      opportunityType,
      verdict: "safe",
      reason: `opportunity type ${opportunityType} is safe`,
    };
  }
}

export function assertOpportunityType(
  value: string,
): asserts value is OpportunityType {
  if (value !== "rumor" && value !== "invitation") {
    throw new NpcIntelligenceError(
      "INVALID_OPPORTUNITY_TYPE",
      `Invalid opportunity type: ${value}`,
    );
  }
}
