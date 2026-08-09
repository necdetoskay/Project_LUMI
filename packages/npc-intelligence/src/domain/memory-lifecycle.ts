import type { CanonicalMemory } from "./memory";
import { isRetrievableMemory } from "./memory";

export const DEFAULT_MEMORY_DECAY_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;

export interface MemoryLifecyclePolicy {
  decayHalfLifeMs: number;
}

export const DEFAULT_MEMORY_LIFECYCLE_POLICY: MemoryLifecyclePolicy = {
  decayHalfLifeMs: DEFAULT_MEMORY_DECAY_HALF_LIFE_MS,
};

function assertLifecyclePolicy(policy: MemoryLifecyclePolicy): void {
  if (!Number.isFinite(policy.decayHalfLifeMs) || policy.decayHalfLifeMs <= 0) {
    throw new Error("memory decay half-life must be a positive finite duration");
  }
}

export function memoryDecayAnchor(memory: CanonicalMemory): Date {
  return memory.lastReinforcedAt ?? memory.createdAt;
}

export function effectiveMemorySalience(
  memory: CanonicalMemory,
  now: Date,
  policy: MemoryLifecyclePolicy = DEFAULT_MEMORY_LIFECYCLE_POLICY,
): number {
  assertLifecyclePolicy(policy);

  if (!isRetrievableMemory(memory, now)) return 0;
  if (memory.lifecycle !== "decaying") return memory.salience;

  const elapsedMs = Math.max(0, now.getTime() - memoryDecayAnchor(memory).getTime());
  const halfLives = elapsedMs / policy.decayHalfLifeMs;
  return memory.salience * Math.pow(0.5, halfLives);
}

export function compareMemoriesForRetrieval(
  left: CanonicalMemory,
  right: CanonicalMemory,
  now: Date,
  policy: MemoryLifecyclePolicy = DEFAULT_MEMORY_LIFECYCLE_POLICY,
): number {
  const salienceDelta =
    effectiveMemorySalience(right, now, policy) -
    effectiveMemorySalience(left, now, policy);
  if (salienceDelta !== 0) return salienceDelta;

  const confidenceDelta = right.confidence - left.confidence;
  if (confidenceDelta !== 0) return confidenceDelta;

  const reinforcementDelta =
    memoryDecayAnchor(right).getTime() - memoryDecayAnchor(left).getTime();
  if (reinforcementDelta !== 0) return reinforcementDelta;

  const creationDelta = right.createdAt.getTime() - left.createdAt.getTime();
  if (creationDelta !== 0) return creationDelta;

  return left.id.localeCompare(right.id);
}
