import { assertConfidence, assertNonEmptyString } from "./validation";

export const BELIEF_SOURCES = [
  "direct_observation",
  "hearsay",
  "inference",
  "memory",
  "world_event",
] as const;
export type BeliefSource = (typeof BELIEF_SOURCES)[number];

export const BELIEF_STATUSES = ["active", "stale", "expired"] as const;
export type BeliefStatus = (typeof BELIEF_STATUSES)[number];

export const MAX_BELIEF_CLAIM_LENGTH = 300;
export const MAX_BELIEF_PROVENANCE = 20;

export interface Belief {
  id: string;
  npcId: string;
  householdId: string;
  factId: string;
  claim: string;
  confidence: number;
  source: BeliefSource;
  provenance: string[];
  createdAt: Date;
  lastVerifiedAt: Date | null;
  expiresAt: Date | null;
  status: BeliefStatus;
}

export function isActiveBelief(belief: Belief, now: Date): boolean {
  if (belief.status !== "active") return false;
  if (belief.expiresAt !== null && belief.expiresAt <= now) return false;
  return true;
}

export function validateBelief(belief: Belief): void {
  assertNonEmptyString(belief.id, "belief.id");
  assertNonEmptyString(belief.npcId, "belief.npcId");
  assertNonEmptyString(belief.householdId, "belief.householdId");
  assertNonEmptyString(belief.factId, "belief.factId");
  assertNonEmptyString(belief.claim, "belief.claim");
  if (belief.claim.length > MAX_BELIEF_CLAIM_LENGTH) {
    throw new Error(
      `belief.claim exceeds ${MAX_BELIEF_CLAIM_LENGTH} characters`,
    );
  }
  assertConfidence(belief.confidence, "belief.confidence");
  if (!(BELIEF_SOURCES as readonly string[]).includes(belief.source)) {
    throw new Error(`Unknown belief source: ${belief.source}`);
  }
  if (!(BELIEF_STATUSES as readonly string[]).includes(belief.status)) {
    throw new Error(`Unknown belief status: ${belief.status}`);
  }
  if (belief.provenance.length > MAX_BELIEF_PROVENANCE) {
    throw new Error(
      `belief.provenance exceeds ${MAX_BELIEF_PROVENANCE} entries`,
    );
  }
}
