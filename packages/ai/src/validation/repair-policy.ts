import type {
  RepairDecision,
  ValidationFinding,
} from "../domain/validation-types";
import { RepairLimitReachedError } from "../domain/generation-errors";

export interface RepairPolicyConfig {
  maxAttempts?: number;
  repairMalformedJson?: boolean;
  allowRegenerate?: boolean;
  fallbackTemplateOnReject?: boolean;
}

const DEFAULT_CONFIG: Required<RepairPolicyConfig> = {
  maxAttempts: 1,
  repairMalformedJson: true,
  allowRegenerate: true,
  fallbackTemplateOnReject: false,
};

export class RepairPolicy {
  private readonly config: Required<RepairPolicyConfig>;

  constructor(config: RepairPolicyConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public decide(
    findings: ValidationFinding[],
    attemptsUsed: number,
  ): RepairDecision {
    if (attemptsUsed >= this.config.maxAttempts) {
      throw new RepairLimitReachedError(
        `Repair limit reached (${attemptsUsed}/${this.config.maxAttempts}).`,
      );
    }

    const errorFindings = findings.filter(
      (finding) => finding.severity === "error",
    );
    if (errorFindings.length === 0) {
      return {
        action: "reject",
        reason: "No error findings to repair.",
        attemptsUsed,
        maxAttempts: this.config.maxAttempts,
      };
    }

    const hasSchemaError = errorFindings.some(
      (finding) => finding.kind === "schema",
    );
    if (hasSchemaError && this.config.repairMalformedJson) {
      return {
        action: "repair",
        reason: "Repair malformed JSON.",
        attemptsUsed,
        maxAttempts: this.config.maxAttempts,
      };
    }

    if (hasSchemaError) {
      return {
        action: "regenerate",
        reason: "Schema error cannot be repaired in place.",
        attemptsUsed,
        maxAttempts: this.config.maxAttempts,
      };
    }

    const hasSafety = errorFindings.some(
      (finding) => finding.kind === "safety",
    );
    if (hasSafety) {
      return {
        action: "reject",
        reason: "Safety violations cannot be repaired.",
        attemptsUsed,
        maxAttempts: this.config.maxAttempts,
      };
    }

    const hasContinuity = errorFindings.some(
      (finding) => finding.kind === "continuity",
    );
    if (hasContinuity && this.config.allowRegenerate) {
      return {
        action: "regenerate",
        reason: "Regenerate with stricter continuity context.",
        attemptsUsed,
        maxAttempts: this.config.maxAttempts,
      };
    }

    if (this.config.fallbackTemplateOnReject) {
      return {
        action: "fallback_template",
        reason: "Use safe template fallback.",
        attemptsUsed,
        maxAttempts: this.config.maxAttempts,
      };
    }

    return {
      action: "reject",
      reason: "No applicable repair path.",
      attemptsUsed,
      maxAttempts: this.config.maxAttempts,
    };
  }
}
