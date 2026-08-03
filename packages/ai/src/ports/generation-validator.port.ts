import type { GenerationTask } from "../domain/generation-types";
import type { ValidationReport } from "../domain/validation-types";

export interface GenerationValidatorPort {
  validate(
    task: GenerationTask,
    output: unknown,
    context?: unknown,
  ): Promise<ValidationReport>;
}
