import type { ValidationFinding } from "../domain/validation-types";

export interface SafetyConfig {
  forbiddenPatterns?: string[];
  maxScaryWords?: number;
}

const DEFAULT_FORBIDDEN_PATTERNS = [
  "sex",
  "kill yourself",
  "suicide",
  "blood",
  "weapon",
  "gun",
  "die",
  "murder",
  "drug",
  "alcohol",
  "cigarette",
  "vape",
  "scary",
  "horror",
];

const SCARY_WORDS = [
  "monster attack",
  "chase",
  "trapped",
  "dark alone",
  "scream",
  "terrified",
];

export const SAFETY_CODE = "SAFETY-001";
export const SAFETY_SCARY_CODE = "SAFETY-002";

export class SafetyChecker {
  private readonly forbiddenPatterns: string[];
  private readonly maxScaryWords: number;

  constructor(config: SafetyConfig = {}) {
    this.forbiddenPatterns =
      config.forbiddenPatterns ?? DEFAULT_FORBIDDEN_PATTERNS;
    this.maxScaryWords = config.maxScaryWords ?? 0;
  }

  public check(text: string): ValidationFinding[] {
    const findings: ValidationFinding[] = [];
    const lower = text.toLowerCase();

    const matched = this.forbiddenPatterns.filter((pattern) =>
      lower.includes(pattern.toLowerCase()),
    );
    if (matched.length > 0) {
      findings.push({
        kind: "safety",
        code: SAFETY_CODE,
        message: `Forbidden content detected: ${matched.join(", ")}.`,
        severity: "error",
      });
    }

    const scaryCount = SCARY_WORDS.filter((word) =>
      lower.includes(word),
    ).length;
    if (scaryCount > this.maxScaryWords) {
      findings.push({
        kind: "safety",
        code: SAFETY_SCARY_CODE,
        message: `Content exceeds age-appropriate scariness threshold (${scaryCount} signal(s) found).`,
        severity: "error",
      });
    }

    return findings;
  }
}
