const DEFAULT_DENYLIST = [
  "password",
  "secret",
  "token",
  "cookie",
  "sessionid",
  "authorization",
  "resettoken",
  "prompt",
  "storycontent",
  "childname",
  "childdob",
  "email",
  "phone",
  "address",
];

const DEFAULT_ALLOWLIST: string[] = [];

type RedactOptions = {
  denylist?: string[];
  allowlist?: string[];
  placeholder?: string;
};

function normalizeKey(key: string): string {
  return key.replace(/[_-]/g, "").toLowerCase();
}

function matchesDenylist(key: string, denylist: string[]): boolean {
  const normalized = normalizeKey(key);
  return denylist.some(
    (pattern) =>
      normalized.includes(pattern.toLowerCase()) ||
      key.toLowerCase().includes(pattern.toLowerCase()),
  );
}

function matchesAllowlist(key: string, allowlist: string[]): boolean {
  const normalized = normalizeKey(key);
  return allowlist.some(
    (pattern) =>
      normalized.includes(pattern.toLowerCase()) ||
      key.toLowerCase().includes(pattern.toLowerCase()),
  );
}

export function redact(value: unknown, options: RedactOptions = {}): unknown {
  const {
    denylist = DEFAULT_DENYLIST,
    allowlist = DEFAULT_ALLOWLIST,
    placeholder = "[REDACTED]",
  } = options;

  const effectiveDenylist = denylist.filter(
    (pattern) =>
      !allowlist.some(
        (allowed) => normalizeKey(allowed) === normalizeKey(pattern),
      ),
  );

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, options));
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (matchesAllowlist(key, allowlist)) {
        result[key] = val;
      } else if (matchesDenylist(key, effectiveDenylist)) {
        result[key] = placeholder;
      } else if (typeof val === "object" && val !== null) {
        result[key] = redact(val, options);
      } else {
        result[key] = val;
      }
    }

    return result;
  }

  return value;
}
