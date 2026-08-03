import type { NeedType } from "@lumi/profiles";

export const CANDIDATE_SAFETY = ["safe", "conditional", "blocked"] as const;
export type CandidateSafety = (typeof CANDIDATE_SAFETY)[number];

export interface CandidateAction {
  id: string;
  kind: string;
  description: string;
  requiredFactIds: string[];
  targetCharacterId: string | null;
  needTypes: NeedType[];
  /** 0..1 how well the action fits the NPC personality. */
  personalityFit: number;
  safety: CandidateSafety;
}
