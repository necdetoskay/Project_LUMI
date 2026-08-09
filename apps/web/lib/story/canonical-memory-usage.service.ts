import { DrizzleCanonicalMemoryRepository } from "@lumi/npc-intelligence/db";
import type { CanonicalMemoryUsageResult } from "@lumi/npc-intelligence/ports";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const MEMORY_KEY_PATTERN = new RegExp(
  `^memory:(character|npc):(${UUID}):(${UUID})$`,
  "i",
);

export interface CanonicalMemoryUsageEvidence {
  ownerType: "character" | "npc";
  ownerId: string;
  memoryId: string;
}

export interface ReinforceSceneMemoryUsageInput {
  householdId: string;
  worldId: string;
  childProfileId: string;
  sceneId: string;
  usedContinuityKeys: string[];
  at?: Date;
}

export interface ReinforceSceneMemoryUsageResult {
  applied: number;
  duplicate: number;
  rejected: number;
}

export function parseCanonicalMemoryUsageKey(
  key: string,
): CanonicalMemoryUsageEvidence | null {
  const match = MEMORY_KEY_PATTERN.exec(key);
  if (!match) return null;
  return {
    ownerType: match[1]!.toLowerCase() as "character" | "npc",
    ownerId: match[2]!.toLowerCase(),
    memoryId: match[3]!.toLowerCase(),
  };
}

export async function reinforceSceneMemoryUsage(
  input: ReinforceSceneMemoryUsageInput,
): Promise<ReinforceSceneMemoryUsageResult> {
  const repository = new DrizzleCanonicalMemoryRepository();
  const at = input.at ?? new Date();
  const evidence = input.usedContinuityKeys
    .map(parseCanonicalMemoryUsageKey)
    .filter((value): value is CanonicalMemoryUsageEvidence => value !== null);

  const uniqueEvidence = [
    ...new Map(
      evidence.map((item) => [
        `${item.ownerType}:${item.ownerId}:${item.memoryId}`,
        item,
      ]),
    ).values(),
  ];

  const summary: ReinforceSceneMemoryUsageResult = {
    applied: 0,
    duplicate: 0,
    rejected: 0,
  };

  for (const item of uniqueEvidence) {
    const result: CanonicalMemoryUsageResult =
      await repository.reinforceForScene({
        householdId: input.householdId,
        worldId: input.worldId,
        childProfileId: input.childProfileId,
        ownerType: item.ownerType,
        ownerId: item.ownerId,
        memoryId: item.memoryId,
        sceneId: input.sceneId,
        at,
      });
    summary[result] += 1;
  }

  return summary;
}

export function readUsedContinuityKeysFromSceneMetadata(
  metadata: unknown,
): string[] {
  if (!metadata || typeof metadata !== "object") return [];
  const keys = (metadata as Record<string, unknown>)["usedContinuityKeys"];
  if (!Array.isArray(keys)) return [];
  return keys.filter((value): value is string => typeof value === "string");
}
