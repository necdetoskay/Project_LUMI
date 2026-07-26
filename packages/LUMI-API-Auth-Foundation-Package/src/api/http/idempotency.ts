import { headers } from "next/headers";

export class MissingIdempotencyKeyError extends Error {
  readonly code = "IDEMPOTENCY_KEY_REQUIRED";
  readonly status = 400;

  constructor() {
    super("Idempotency-Key header zorunludur.");
  }
}

export async function requireIdempotencyKey(): Promise<string> {
  const headerStore = await headers();
  const key = headerStore.get("idempotency-key");

  if (!key || key.length < 8 || key.length > 240) {
    throw new MissingIdempotencyKeyError();
  }

  return key;
}
