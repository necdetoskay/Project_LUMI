import type {
  ParentControlPolicy,
} from "./types";

export function evaluateParentApproval(input: {
  policy: ParentControlPolicy;
  interactionType: string;
  safetyScore: number;
  urgency: number;
  childAgeBand?: string;
}): {
  requiresApproval: boolean;
  childVisible: boolean;
  blocked: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (
    input.policy.mutedInteractionTypes.includes(
      input.interactionType,
    )
  ) {
    return {
      requiresApproval: false,
      childVisible: false,
      blocked: true,
      reasons: ["Interaction type is muted by parent"],
    };
  }

  if (
    input.childAgeBand &&
    input.policy.allowedAgeBands.length > 0 &&
    !input.policy.allowedAgeBands.includes(
      input.childAgeBand,
    )
  ) {
    return {
      requiresApproval: false,
      childVisible: false,
      blocked: true,
      reasons: ["Child age band is not allowed"],
    };
  }

  if (
    input.interactionType === "gift" &&
    !input.policy.allowGiftAcceptance
  ) {
    reasons.push("Gift acceptance requires parent control");
  }

  if (
    input.interactionType === "warning" &&
    input.policy.allowWarningsWithoutApproval
  ) {
    return {
      requiresApproval: false,
      childVisible: true,
      blocked: false,
      reasons,
    };
  }

  if (input.policy.approvalMode === "always") {
    return {
      requiresApproval: true,
      childVisible: false,
      blocked: false,
      reasons,
    };
  }

  if (
    input.policy.approvalMode === "high_risk_only"
  ) {
    const highRisk =
      input.safetyScore < 0.9 ||
      input.urgency >= 0.8 ||
      reasons.length > 0;

    return {
      requiresApproval: highRisk,
      childVisible: !highRisk,
      blocked: false,
      reasons,
    };
  }

  return {
    requiresApproval: false,
    childVisible: true,
    blocked: false,
    reasons,
  };
}
