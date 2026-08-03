import type { GenerationTask } from "../domain/generation-types";
import type { ValidationReport } from "../domain/validation-types";
import type { GenerationValidatorPort } from "../ports/generation-validator.port";

export class NoOpValidator implements GenerationValidatorPort {
  public async validate(
    task: GenerationTask,
    output: unknown,
  ): Promise<ValidationReport> {
    void task;
    void output;
    return { valid: true, findings: [] };
  }
}
