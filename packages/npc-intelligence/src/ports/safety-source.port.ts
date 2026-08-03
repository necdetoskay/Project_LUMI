export interface NpcSafetySnapshot {
  contentBoundary: "strict" | "moderate" | "open";
  forbiddenCandidateKinds: string[];
  requireParentApprovalForConditional: boolean;
}

export interface NpcSafetySourcePort {
  fetchPolicy(householdId: string): Promise<NpcSafetySnapshot>;
}
