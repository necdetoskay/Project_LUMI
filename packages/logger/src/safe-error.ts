const SECRET_PATTERNS = [
  /postgresql:\/\/\S+/gi,
  /postgres:\/\/\S+/gi,
  /redis:\/\/\S+/gi,
  /password[=:]\s*\S+/gi,
  /token[=:]\s*\S+/gi,
  /secret[=:]\s*\S+/gi,
  /cookie[=:]\s*\S+/gi,
  /authorization[=:]\s*\S+/gi,
  /Bearer\s+[A-Za-z0-9\-_.]+/g,
  /sk-[A-Za-z0-9]{10,}/g,
];

function redactSecrets(value: string): string {
  let result = value;

  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, (match) => {
      const prefix = match.length > 12 ? match.slice(0, 8) : "";
      return prefix ? `${prefix}[REDACTED]` : "[REDACTED]";
    });
  }

  return result;
}

export function safeError(error: unknown): Record<string, unknown> {
  if (error === null || error === undefined) {
    return { error: "unknown" };
  }

  if (error instanceof Error) {
    const result: Record<string, unknown> = {
      message: redactSecrets(error.message),
      name: error.name,
    };

    if (error.cause instanceof Error) {
      result.cause = safeError(error.cause);
    } else if (error.cause) {
      result.cause = redactSecrets(String(error.cause));
    }

    if (
      "code" in error &&
      typeof (error as Record<string, unknown>).code === "string"
    ) {
      result.code = (error as Record<string, unknown>).code;
    }

    if ("stack" in error) {
      const stackLines = (error.stack ?? "").split("\n").slice(0, 6);
      result.stack = stackLines.map(redactSecrets).join("\n");
    }

    return result;
  }

  if (typeof error === "object") {
    return { error: String(error) };
  }

  return { error: redactSecrets(String(error)) };
}
