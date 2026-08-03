import type { GenerationError } from "../domain/generation-errors";
import type {
  GenerationRequest,
  GenerationResponse,
} from "../domain/generation-types";

export interface GenerationOrchestratorPort {
  generate(request: GenerationRequest): Promise<GenerationResponse<unknown>>;
  generateTyped<T>(request: GenerationRequest): Promise<GenerationResponse<T>>;
  mapError(error: unknown): GenerationError;
}
