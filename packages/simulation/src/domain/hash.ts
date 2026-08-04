export function hashString(input: string): string {
  if (typeof input !== "string") {
    throw new Error("hashString expects a string");
  }
  const bytes = new TextEncoder().encode(input);
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i]!;
    h ^= byte;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function hashJson(input: unknown): string {
  return hashString(JSON.stringify(input));
}

export function hashStable(input: Record<string, unknown>): string {
  return hashString(stableStringify(input));
}

function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(stableStringify).join(",") + "]";
  }
  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const parts: string[] = [];
  for (const k of keys) {
    const v = record[k];
    parts.push(JSON.stringify(k) + ":" + stableStringify(v));
  }
  return "{" + parts.join(",") + "}";
}
