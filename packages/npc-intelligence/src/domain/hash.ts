import { createHash } from "node:crypto";

export function hashString(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hashJson(input: unknown): string {
  return hashString(JSON.stringify(input));
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const entries = keys.map(
    (key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`,
  );
  return `{${entries.join(",")}}`;
}

/** Key-order independent hash for deterministic content hashing. */
export function hashStable(input: unknown): string {
  return hashString(stableStringify(input));
}
