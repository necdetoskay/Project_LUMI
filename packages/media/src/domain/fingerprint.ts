import { createHash } from "node:crypto";

export interface FingerprintInput {
  kind: "image" | "audio";
  assetType: string;
  scope: {
    householdId: string;
    childProfileId: string;
    worldId: string;
  };
  identity?: string | undefined;
  policyKey: string;
  contentKey: string;
}

function stableSerialize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableSerialize(record[k])}`)
    .join(",")}}`;
}

export function computeMediaFingerprint(input: FingerprintInput): string {
  return sha256Hex(stableSerialize(input));
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
