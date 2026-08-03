import type { ValidationFinding } from "../domain/validation-types";

export interface CanonRule {
  pattern: string;
  code: string;
  message: string;
}

export interface CanonConfig {
  rules?: CanonRule[];
}

const DEFAULT_RULES: CanonRule[] = [
  {
    pattern: "chosen one",
    code: "CANON-001",
    message: "Generic 'chosen one' premise violates canon guidance.",
  },
  {
    pattern: "you are the only",
    code: "CANON-002",
    message: "Unsupported exceptionalism premise.",
  },
];

export const CANON_PATTERN_CODE = "CANON-001";

export class CanonChecker {
  private readonly rules: CanonRule[];

  constructor(config: CanonConfig = {}) {
    this.rules = config.rules ?? DEFAULT_RULES;
  }

  public check(text: string): ValidationFinding[] {
    const findings: ValidationFinding[] = [];
    const lower = text.toLowerCase();

    for (const rule of this.rules) {
      if (lower.includes(rule.pattern)) {
        findings.push({
          kind: "canon",
          code: rule.code,
          message: rule.message,
          severity: "error",
        });
      }
    }

    return findings;
  }
}
