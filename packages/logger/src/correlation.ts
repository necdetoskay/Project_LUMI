import { AsyncLocalStorage } from "node:async_hooks";

export const correlationStorage = new AsyncLocalStorage<string>();

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

export function isValidCorrelationId(value: string): boolean {
  if (typeof value !== "string") {
    return false;
  }

  if (value.length < 8 || value.length > 128) {
    return false;
  }

  return UUID_V4_PATTERN.test(value);
}

export function withCorrelation<T>(correlationId: string, fn: () => T): T {
  return correlationStorage.run(correlationId, fn);
}

export function getCorrelationId(): string | undefined {
  return correlationStorage.getStore();
}
