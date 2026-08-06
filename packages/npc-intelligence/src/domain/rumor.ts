import {
  assertConfidence,
  assertFiniteNumber,
  assertNonEmptyString,
  clamp01,
} from "./validation";
import { NpcIntelligenceError } from "./errors";

export const MAX_RUMOR_PROVENANCE = 20;
export const RUMOR_MAX_HOPS = 10;

/** Confidence retained per propagation hop (deterministic decay factor). */
export const HOP_DECAY_FACTOR = 0.8;
/** Confidence decay per day elapsed (deterministic time decay). */
export const TIME_DECAY_PER_DAY = 0.1;
/** Below this confidence a rumor is considered too unreliable to propagate. */
export const RUMOR_PROPAGATION_FLOOR = 0.2;

export interface Rumor {
  id: string;
  householdId: string;
  /** The underlying fact the rumor refers to. */
  factId: string;
  claim: string;
  /** NPC who originated the rumor (or first observed the fact). */
  originNpcId: string;
  /** Event/fact that first produced this rumor. */
  sourceEventId: string | null;
  /** Current confidence (decayed over hops + time). */
  confidence: number;
  /** Transfer chain: [originNpcId, ...relayNpcIds] in propagation order. */
  provenance: string[];
  /** Number of hops the rumor has travelled. */
  hops: number;
  createdAt: Date;
  /** Rumor loses validity at this time. */
  expiresAt: Date | null;
}

export interface CreateRumorInput {
  householdId: string;
  factId: string;
  claim: string;
  originNpcId: string;
  sourceEventId?: string | null;
  confidence: number;
  provenance?: string[];
  expiresAt?: Date | null;
}

export function createRumor(input: CreateRumorInput): Rumor {
  assertNonEmptyString(input.householdId, "rumor.householdId");
  assertNonEmptyString(input.factId, "rumor.factId");
  assertNonEmptyString(input.claim, "rumor.claim");
  assertNonEmptyString(input.originNpcId, "rumor.originNpcId");
  assertConfidence(input.confidence, "rumor.confidence");

  const provenance = input.provenance ?? [input.originNpcId];
  if (provenance.length > MAX_RUMOR_PROVENANCE) {
    throw new NpcIntelligenceError(
      "RUMOR_PROVENANCE_EXCEEDED",
      `rumor provenance exceeds ${MAX_RUMOR_PROVENANCE} entries`,
    );
  }

  return {
    id: crypto.randomUUID(),
    householdId: input.householdId,
    factId: input.factId,
    claim: input.claim,
    originNpcId: input.originNpcId,
    sourceEventId: input.sourceEventId ?? null,
    confidence: input.confidence,
    provenance: [...provenance],
    hops: provenance.length - 1,
    createdAt: new Date(),
    expiresAt: input.expiresAt ?? null,
  };
}

export interface DecayRumorInput {
  rumor: Rumor;
  /** Elapsed time since the rumor was created (drives time decay). */
  elapsedMs: number;
}

export interface DecayResult {
  confidence: number;
  hops: number;
  provenance: string[];
  belowFloor: boolean;
}

/**
 * Deterministically decays a rumor's confidence when it propagates to a new
 * NPC: one hop decrements by HOP_DECAY_FACTOR, and elapsed time decrements by
 * TIME_DECAY_PER_DAY per 24h. Provenance grows by the relay NPC.
 */
export function decayRumorForHop(
  rumor: Rumor,
  relayNpcId: string,
  elapsedMs: number,
): DecayResult {
  assertFiniteNumber(elapsedMs, "elapsedMs");
  assertNonEmptyString(relayNpcId, "relayNpcId");

  const hopDecay = HOP_DECAY_FACTOR;
  const days = elapsedMs / (24 * 60 * 60 * 1000);
  const timeDecay = Math.max(0, 1 - days * TIME_DECAY_PER_DAY);
  const confidence = clamp01(rumor.confidence * hopDecay * timeDecay);

  const provenance = [...rumor.provenance, relayNpcId];
  return {
    confidence,
    hops: provenance.length - 1,
    provenance,
    belowFloor: confidence < RUMOR_PROPAGATION_FLOOR,
  };
}
