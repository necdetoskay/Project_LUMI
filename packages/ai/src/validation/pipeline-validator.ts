import type { GenerationTask } from "../domain/generation-types";
import type {
  ValidationFinding,
  ValidationReport,
} from "../domain/validation-types";
import type { GenerationValidatorPort } from "../ports/generation-validator.port";
import { generationOutputSchemas } from "./output-schemas";
import { SafetyChecker } from "./safety-checker";
import { CanonChecker } from "./canon-checker";
import { ContinuityChecker, type ContinuityInput } from "./continuity-checker";

export interface ValidatorContext {
  safetyText?: string;
  continuity?: ContinuityInput;
  knownEntities?: string[];
  canonText?: string;
}

export interface GenerationValidatorConfig {
  safety?: SafetyChecker;
  canon?: CanonChecker;
  continuity?: ContinuityChecker;
}

function stringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export class PipelineValidator implements GenerationValidatorPort {
  private readonly safety: SafetyChecker;
  private readonly canon: CanonChecker;
  private readonly continuity: ContinuityChecker;

  constructor(config: GenerationValidatorConfig = {}) {
    this.safety = config.safety ?? new SafetyChecker();
    this.canon = config.canon ?? new CanonChecker();
    this.continuity = config.continuity ?? new ContinuityChecker();
  }

  public async validate(
    task: GenerationTask,
    output: unknown,
    context?: unknown,
  ): Promise<ValidationReport> {
    const findings: ValidationFinding[] = [];
    const ctx = (context as ValidatorContext | undefined) ?? {};

    const schemaResult = generationOutputSchemas[task].safeParse(output);
    if (!schemaResult.success) {
      findings.push({
        kind: "schema",
        code: "SCHEMA-001",
        message: `Output failed ${task} schema validation: ${schemaResult.error.issues[0]?.path.join(".") ?? "root"}: ${schemaResult.error.issues[0]?.message ?? "invalid"}`,
        severity: "error",
      });
    } else {
      const text = stringify(schemaResult.data);
      findings.push(...this.safety.check(ctx.safetyText ?? text));
      findings.push(...this.canon.check(ctx.canonText ?? text));

      if (ctx.continuity) {
        findings.push(...this.continuity.check(ctx.continuity));
      }
    }

    return {
      valid: !findings.some((finding) => finding.severity === "error"),
      findings,
    };
  }
}
