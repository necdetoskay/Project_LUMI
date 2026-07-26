export type ParentApprovalMode =
  | "always"
  | "high_risk_only"
  | "never";

export type ParentControlPolicy = {
  householdId: string;
  approvalMode: ParentApprovalMode;
  allowChildToAcceptOpportunities: boolean;
  allowGiftAcceptance: boolean;
  allowWarningsWithoutApproval: boolean;
  maxDailyOpportunities: number;
  mutedInteractionTypes: string[];
  allowedAgeBands: string[];
};
