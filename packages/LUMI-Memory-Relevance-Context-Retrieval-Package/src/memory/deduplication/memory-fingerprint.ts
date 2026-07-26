import { createHash } from "node:crypto";

export function normalizeMemoryText(
  value: string,
): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9çğıöşü\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function createMemoryFingerprint(input: {
  worldId: string;
  memoryType: string;
  summary: string;
  sourceEntityType: string;
  sourceEntityId: string;
}): string {
  const normalized = JSON.stringify({
    worldId: input.worldId,
    memoryType: input.memoryType,
    summary: normalizeMemoryText(input.summary),
    sourceEntityType: input.sourceEntityType,
    sourceEntityId: input.sourceEntityId,
  });

  return createHash("sha256")
    .update(normalized)
    .digest("hex");
}
