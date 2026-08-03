export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function assertFiniteNumber(value: number, field: string): void {
  if (
    typeof value !== "number" ||
    Number.isNaN(value) ||
    !Number.isFinite(value)
  ) {
    throw new Error(
      `Expected a finite number for ${field}, got ${String(value)}`,
    );
  }
}

export function assertConfidence(value: number, field: string): void {
  assertFiniteNumber(value, field);
  if (value < 0 || value > 1) {
    throw new Error(`${field} must be between 0 and 1, got ${value}`);
  }
}

export function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
}
